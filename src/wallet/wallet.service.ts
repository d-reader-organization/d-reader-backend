import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Metaplex } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { metaplex } from '../utils/metaplex';
import { HeliusService } from '../webhooks/helius/helius.service';
import {
  FREE_MINT_GROUP_LABEL,
  REFERRAL_REWARD_GROUP_LABEL,
  REFERRAL_REWARD_THRESHOLD,
  SAGA_COLLECTION_ADDRESS,
} from '../constants';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Prisma, Wallet } from '@prisma/client';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { isEmpty, sortBy } from 'lodash';
import { hasCompletedSetup } from '../utils/user';
import { DAS, Interface, Scope } from 'helius-sdk';
import {
  doesWalletIndexCorrectly,
  findOurCandyMachine,
  getAsset,
  getAssetsByOwner,
} from '../utils/das';

@Injectable()
export class WalletService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    this.metaplex = metaplex;
  }

  async update(address: string, updateWalletDto: UpdateWalletDto) {
    try {
      const updatedWallet = await this.prisma.wallet.update({
        where: { address },
        data: updateWalletDto,
      });

      return updatedWallet;
    } catch {
      throw new NotFoundException(`Wallet with address ${address} not found`);
    }
  }

  // TODO v2: this command should also give it's best to update UNKNOWN's, price and CM.
  async syncWallet(address: string) {
    const compeleteAssets = await this.prisma.digitalAsset
      .findMany({
        where: { ownerAddress: address },
      })
      .then((nfts) => nfts.map((nft) => nft.address));

    const candyMachines = await this.prisma.candyMachine.findMany({
      select: { address: true },
    });

    const limit = 1000;
    let page = 1;
    let assets = await getAssetsByOwner(address, page, limit);

    while (!isEmpty(assets)) {
      console.log(`Syncing ${assets.length} assets ...!`);

      const legacyAssets = assets.filter(
        (asset) => asset.interface == Interface.PROGRAMMABLENFT,
      );
      const coreAssets = assets.filter(
        (asset) => asset.interface.toString() === 'MplCoreAsset',
      );

      await this.syncLegacyAssets(candyMachines, compeleteAssets, legacyAssets);
      await this.syncCoreAssets(coreAssets);

      page++;
      assets = await getAssetsByOwner(address, page, limit);
    }

    // Sync nfts with new owner
    const nftsWithNewOwner = compeleteAssets.filter((address) =>
      assets.find((currentOwnerNft) => currentOwnerNft.id === address),
    );
    for await (const nftAddress of nftsWithNewOwner) {
      const asset = await getAsset(nftAddress);
      const newOwner = asset.ownership.owner;
      await this.prisma.digitalAsset.update({
        where: { address: nftAddress },
        data: {
          owner: {
            connectOrCreate: {
              where: { address: newOwner },
              create: { address: newOwner },
            },
          },
        },
      });
    }
  }

  async syncCoreAssets(coreAssets: DAS.GetAssetResponse[]) {
    const collections = await this.prisma.collection.findMany({});
    const assets = coreAssets.filter((asset) => {
      const group = asset.grouping.find(
        (group) => group?.group_key == 'collection',
      );
      return collections.find(
        (collection) => group.group_value === collection.address,
      );
    });

    for await (const asset of assets) {
      const group = asset.grouping.find(
        (group) => group?.group_key == 'collection',
      );

      // Considering that there is only one core candymachine for one core collection
      const candyMachine = await this.prisma.candyMachine.findFirst({
        where: { collectionAddress: group.group_value },
      });
      const indexedAsset = await this.heliusService.reIndexAsset(
        asset,
        candyMachine.address,
      );

      const doesReceiptExists = await this.prisma.candyMachineReceipt.findFirst(
        {
          where: { assetAddress: indexedAsset.address },
        },
      );

      if (!doesReceiptExists) {
        const UNKNOWN = 'UNKNOWN';
        const userId: number = indexedAsset.owner?.userId;

        const receiptData: Prisma.CandyMachineReceiptCreateInput = {
          asset: { connect: { address: indexedAsset.address } },
          candyMachine: { connect: { address: candyMachine.address } },
          buyer: {
            connectOrCreate: {
              where: { address: indexedAsset.ownerAddress },
              create: { address: indexedAsset.ownerAddress },
            },
          },
          price: 0,
          timestamp: new Date(),
          description: `${indexedAsset.address} minted ${asset.content.metadata.name} for ${UNKNOWN} SOL.`,
          splTokenAddress: UNKNOWN,
          transactionSignature: UNKNOWN,
          label: UNKNOWN,
        };

        if (userId) {
          receiptData.user = { connect: { id: userId } };
        }

        await this.prisma.candyMachineReceipt.create({
          data: receiptData,
        });
      }

      this.heliusService.subscribeTo(asset.id);
    }
  }

  async syncLegacyAssets(
    candyMachines: { address: string }[],
    compeleteAssets: string[],
    legacyAssets: DAS.GetAssetResponse[],
  ) {
    const unsyncedLegacyAssets = (
      await Promise.all(
        legacyAssets.map(async (asset) => {
          const candyMachineAddress = findOurCandyMachine(
            this.metaplex,
            candyMachines,
            asset.creators,
          );
          if (candyMachineAddress) {
            const updateAuthority =
              asset.authorities?.find((authority) =>
                authority.scopes.find((scope) => scope == Scope.METADATA),
              ) ??
              asset.authorities.find((authority) =>
                authority.scopes.find((scope) => scope == Scope.FULL),
              );

            const collection = asset.grouping.find(
              (group) => group?.group_key == 'collection',
            );
            const isIndexed = await doesWalletIndexCorrectly(
              asset.id,
              asset.content.json_uri,
              updateAuthority?.address ??
                this.metaplex.identity().publicKey.toString(),
              candyMachineAddress,
              collection.group_value,
              asset.creators,
              compeleteAssets,
            );
            if (!isIndexed) {
              return asset;
            }
          }
        }),
      )
    ).filter(Boolean);

    for await (const asset of unsyncedLegacyAssets) {
      const candyMachine = findOurCandyMachine(
        this.metaplex,
        candyMachines,
        asset.creators,
      );

      const indexedAsset = await this.heliusService.reIndexAsset(
        asset,
        candyMachine,
      );
      const doesReceiptExists = await this.prisma.candyMachineReceipt.findFirst(
        {
          where: { assetAddress: indexedAsset.address },
        },
      );

      if (!doesReceiptExists) {
        const UNKNOWN = 'UNKNOWN';
        const userId: number = indexedAsset.owner?.userId;

        const receiptData: Prisma.CandyMachineReceiptCreateInput = {
          asset: { connect: { address: indexedAsset.address } },
          candyMachine: { connect: { address: candyMachine } },
          buyer: {
            connectOrCreate: {
              where: { address: indexedAsset.ownerAddress },
              create: { address: indexedAsset.ownerAddress },
            },
          },
          price: 0,
          timestamp: new Date(),
          description: `${indexedAsset.address} minted ${asset.content.metadata.name} for ${UNKNOWN} SOL.`,
          splTokenAddress: UNKNOWN,
          transactionSignature: UNKNOWN,
          label: UNKNOWN,
        };

        if (userId) {
          receiptData.user = { connect: { id: userId } };
        }

        await this.prisma.candyMachineReceipt.create({
          data: receiptData,
        });
      }

      this.heliusService.subscribeTo(asset.id);
    }
  }

  /** This function allowlists a wallet on all the active Candy Machines
   * which have a group with the specified label */
  async allowlistUserWallet(wallets: Wallet[], label: string) {
    const candyMachines =
      await this.candyMachineService.findActiveRewardCandyMachine(label);
    const lastConnectedWallet = sortBy(wallets, (wallet) => wallet.connectedAt);

    const addWallet = candyMachines.map((candyMachine) =>
      this.candyMachineService.addAllowList(
        candyMachine.candyMachineAddress,
        [lastConnectedWallet.at(-1).address],
        label,
      ),
    );
    await Promise.all(addWallet);
  }

  async makeEligibleForCompletedAccountBonus(userId: number) {
    if (!userId) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { wallets: true },
      });

      const isUserReady = hasCompletedSetup(user);
      const isEligible = isUserReady && !user.rewardedAt;

      if (isEligible) {
        await this.allowlistUserWallet(user.wallets, FREE_MINT_GROUP_LABEL);
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            rewardedAt: new Date(),
            referralsRemaining: { increment: 1 },
          },
        });
      }
    } catch (e) {
      console.error(
        `Error while making the user eligible for a completed account bonus: ${e}`,
      );
    }
  }

  async makeEligibleForReferralBonus(userId: number) {
    if (!userId) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallets: true,
          referrals: { include: { wallets: true } },
          // TODO rely on _count instead of wallets: true
          // _count: { select: { wallets: true } },
        },
      });

      const isUserReady = hasCompletedSetup(user);

      const verifiedRefereesCount = user.referrals.filter(
        (referee) => referee.emailVerifiedAt && referee.wallets.length,
      ).length;

      const hasUserReferredEnoughNewUsers =
        verifiedRefereesCount >= REFERRAL_REWARD_THRESHOLD;

      const isEligible =
        isUserReady && hasUserReferredEnoughNewUsers && !user.referCompeletedAt;

      if (isEligible) {
        await this.allowlistUserWallet(
          user.wallets,
          REFERRAL_REWARD_GROUP_LABEL,
        );
        await this.prisma.user.update({
          where: { id: user.id },
          data: { referCompeletedAt: new Date() },
        });
      }
    } catch (e) {
      console.error(
        `Error while making the user eligible for a referral bonus: ${e}`,
      );
    }
  }

  async findAll() {
    const wallets = await this.prisma.wallet.findMany();
    return wallets;
  }

  async findOne(address: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet ${address} not found`);
    } else return wallet;
  }

  async getAssets(address: string) {
    const nfts = await this.prisma.digitalAsset.findMany({
      where: { ownerAddress: address },
      orderBy: { name: 'asc' },
    });

    return nfts;
  }

  /** Check if wallet has SGT NFT */
  async hasSagaGenesisToken(address: string) {
    const nfts = await this.metaplex
      .nfts()
      .findAllByOwner({ owner: new PublicKey(address) });

    const sagaToken = nfts.find(
      (nft) =>
        nft.collection &&
        nft.collection.address.toString() === SAGA_COLLECTION_ADDRESS &&
        nft.collection.verified,
    );

    return !!sagaToken;
  }
}
