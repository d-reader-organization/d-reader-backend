import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { metaplex } from '../utils/metaplex';
import { HeliusService } from '../webhooks/helius/helius.service';
import {
  REFERRAL_REWARD_THRESHOLD,
  SAGA_COLLECTION_ADDRESS,
} from '../constants';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { CouponType, Prisma } from '@prisma/client';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { isEmpty } from 'lodash';
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

  // TODO: this command should also give it's best to update UNKNOWN's, price and CM.
  async syncWallet(address: string) {
    const compeleteAssets = await this.prisma.collectibleComic
      .findMany({
        where: { digitalAsset: { ownerAddress: address } },
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
      await this.prisma.collectibleComic.update({
        where: { address: nftAddress },
        data: {
          digitalAsset: {
            update: {
              owner: {
                connectOrCreate: {
                  where: { address: newOwner },
                  create: { address: newOwner },
                },
              },
            },
          },
        },
      });
    }
  }

  async syncCoreAssets(coreAssets: DAS.GetAssetResponse[]) {
    const collections = await this.prisma.collectibleComicCollection.findMany(
      {},
    );
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

      if (!candyMachine) {
        console.log(`Candy machine not found for ${group.group_value}`);
        continue;
      }

      const indexedAsset = await this.heliusService.reIndexAsset(
        asset,
        candyMachine.address,
      );

      const doesReceiptExists = await this.prisma.candyMachineReceipt.findFirst(
        {
          where: { collectibleComicAddress: indexedAsset.address },
        },
      );

      if (!doesReceiptExists) {
        const UNKNOWN = 'UNKNOWN';
        const { owner, ownerAddress } = indexedAsset.digitalAsset;
        const userId: number = owner?.userId;

        const coupon = await this.prisma.candyMachineCoupon.findFirst({
          where: {
            candyMachineAddress: candyMachine.address,
            type: CouponType.PublicUser,
            currencySettings: {
              some: {
                splTokenAddress: WRAPPED_SOL_MINT.toString(),
              },
            },
          },
        });

        const receiptData: Prisma.CandyMachineReceiptCreateInput = {
          collectibleComic: { connect: { address: indexedAsset.address } },
          candyMachine: { connect: { address: candyMachine.address } },
          buyer: {
            connectOrCreate: {
              where: { address: ownerAddress },
              create: { address: ownerAddress },
            },
          },
          price: 0,
          timestamp: new Date(),
          description: `${indexedAsset.address} minted ${asset.content.metadata.name} for ${UNKNOWN} SOL.`,
          splTokenAddress: UNKNOWN,
          transactionSignature: UNKNOWN,
          couponId: coupon.id,
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
          where: { collectibleComicAddress: indexedAsset.address },
        },
      );

      const coupon = await this.prisma.candyMachineCoupon.findFirst({
        where: {
          candyMachineAddress: candyMachine,
          type: CouponType.PublicUser,
          currencySettings: {
            some: {
              splTokenAddress: WRAPPED_SOL_MINT.toString(),
            },
          },
        },
      });

      if (!doesReceiptExists) {
        const UNKNOWN = 'UNKNOWN';
        const { owner, ownerAddress } = indexedAsset.digitalAsset;
        const userId: number = owner?.userId;

        const receiptData: Prisma.CandyMachineReceiptCreateInput = {
          collectibleComic: { connect: { address: indexedAsset.address } },
          candyMachine: { connect: { address: candyMachine } },
          buyer: {
            connectOrCreate: {
              where: { address: ownerAddress },
              create: { address: ownerAddress },
            },
          },
          price: 0,
          timestamp: new Date(),
          description: `${indexedAsset.address} minted ${asset.content.metadata.name} for ${UNKNOWN} SOL.`,
          splTokenAddress: UNKNOWN,
          transactionSignature: UNKNOWN,
          // assiging public coupon to the receipt for unknown receipts
          couponId: coupon.id,
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
    const nfts = await this.prisma.collectibleComic.findMany({
      where: { digitalAsset: { ownerAddress: address } },
      orderBy: { name: 'asc' },
      include: {
        metadata: {
          include: {
            collection: {
              include: { comicIssue: { include: { statefulCovers: true } } },
            },
          },
        },
      },
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
