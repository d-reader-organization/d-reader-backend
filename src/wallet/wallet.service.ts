import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Metaplex, isMetadata } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { metaplex } from '../utils/metaplex';
import { fetchOffChainMetadata } from '../utils/nft-metadata';
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
import { sortBy } from 'lodash';
import { IndexedNft } from './dto/types';
import { hasCompletedSetup } from '../utils/user';
import {
  doesWalletIndexCorrectly,
  findOurCandyMachine,
  findOwnerByMint,
} from '../utils/helpers';

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
    const findAllByOwnerResult = await this.metaplex
      .nfts()
      .findAllByOwner({ owner: new PublicKey(address) });

    const compeleteNfts = await this.prisma.nft.findMany({
      where: { ownerAddress: address },
    });

    const nfts = compeleteNfts.map((nft) => nft.address);
    const nftsWithNewOwner = compeleteNfts.filter(
      (nft) =>
        !findAllByOwnerResult.find(
          (currentOwnerNft) =>
            currentOwnerNft.address.toString() === nft.address,
        ),
    );

    const candyMachines = await this.prisma.candyMachine.findMany({
      select: { address: true },
    });

    const onChainMetadatas = findAllByOwnerResult.filter(isMetadata);
    const unsyncedMetadatas = (
      await Promise.all(
        onChainMetadatas.map(async (metadata) => {
          const candyMachineAddress = findOurCandyMachine(
            this.metaplex,
            candyMachines,
            metadata,
          );
          if (candyMachineAddress) {
            const isIndexed = await doesWalletIndexCorrectly(
              metadata,
              nfts,
              candyMachineAddress,
            );
            if (!isIndexed) {
              return metadata;
            }
          }
        }),
      )
    ).filter(Boolean);

    for await (const metadata of unsyncedMetadatas) {
      const collectionMetadata = await fetchOffChainMetadata(metadata.uri);

      const nft = await this.prisma.nft.findFirst({
        where: { address: metadata.mintAddress.toString() },
      });
      const candyMachine = findOurCandyMachine(
        this.metaplex,
        candyMachines,
        metadata,
      );

      let indexedNft: IndexedNft;
      if (nft) {
        indexedNft = await this.heliusService.reindexNft(
          metadata,
          collectionMetadata,
          address,
          candyMachine,
        );
      } else {
        indexedNft = await this.heliusService.indexNft(
          metadata,
          collectionMetadata,
          address,
          candyMachine,
        );
      }

      const doesReceiptExists = await this.prisma.candyMachineReceipt.findFirst(
        {
          where: { nftAddress: indexedNft.address },
        },
      );

      if (!doesReceiptExists) {
        const UNKNOWN = 'UNKNOWN';
        const userId: number = indexedNft.owner?.userId;

        const receiptData: Prisma.CandyMachineReceiptCreateInput = {
          nft: { connect: { address: indexedNft.address } },
          candyMachine: { connect: { address: candyMachine } },
          buyer: {
            connectOrCreate: {
              where: { address: indexedNft.ownerAddress },
              create: { address: indexedNft.ownerAddress },
            },
          },
          price: 0,
          timestamp: new Date(),
          description: `${indexedNft.address} minted ${metadata.name} for ${UNKNOWN} SOL.`,
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

      this.heliusService.subscribeTo(metadata.mintAddress.toString());
    }

    // Sync nfts with new owner
    for await (const nft of nftsWithNewOwner) {
      const newOwner = await findOwnerByMint(
        this.metaplex.connection,
        new PublicKey(nft.address),
      );
      await this.prisma.nft.update({
        where: { address: nft.address },
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
    const nfts = await this.prisma.nft.findMany({
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
