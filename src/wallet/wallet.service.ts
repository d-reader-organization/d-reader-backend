import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  JsonMetadata,
  Metadata,
  Metaplex,
  isMetadata,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { metaplex } from '../utils/metaplex';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../utils/nft-metadata';
import { HeliusService } from '../webhooks/helius/helius.service';
import {
  FREE_MINT_GROUP_LABEL,
  REFERRAL_REWARD_GROUP_LABEL,
  REFERRAL_REWARD_THRESHOLD,
  SAGA_COLLECTION_ADDRESS,
} from '../constants';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Nft, Prisma, Wallet } from '@prisma/client';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { sortBy } from 'lodash';
import { IndexedNft } from './dto/types';
import { hasCompletedSetup } from '../utils/user';
import { AUTH_TAG, pda } from '../candy-machine/instructions/pda';
import { PROGRAM_ID as COMIC_VERSE_ID } from 'dreader-comic-verse';
import { findOurCandyMachine } from '../utils/helpers';
import {
  delegateAuthority,
  verifyMintCreator,
} from '../candy-machine/instructions';
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

  async doesWalletIndexCorrectly(metadata: Metadata, nfts: Nft[]) {
    for (const nft of nfts) {
      const doesNftExists = nft.address === metadata.mintAddress.toString();
      if (doesNftExists) {
        const updateAuthority = metadata.updateAuthorityAddress;
        const offChainMetadata = await fetchOffChainMetadata(nft.uri);
        const rarity = findRarityTrait(offChainMetadata);
        const authority = pda(
          [
            Buffer.from(AUTH_TAG + rarity.toLowerCase()),
            new PublicKey(nft.candyMachineAddress).toBuffer(),
            metadata.collection.address.toBuffer(),
          ],
          COMIC_VERSE_ID,
        );

        if (updateAuthority.equals(authority)) {
          return true;
        }
      }
    }
    return false;
  }

  // TODO v2: this command should also give it's best to update UNKNOWN's, price and CM.
  async syncWallet(address: string) {
    const findAllByOwnerResult = await this.metaplex
      .nfts()
      .findAllByOwner({ owner: new PublicKey(address) });

    const nfts = await this.prisma.nft.findMany({
      where: { ownerAddress: address },
    });

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
            const isIndexed = await this.doesWalletIndexCorrectly(
              metadata,
              nfts,
            );
            if (!isIndexed) {
              return metadata;
            }
          }
        }),
      )
    ).filter(Boolean);

    for (const metadata of unsyncedMetadatas) {
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
        indexedNft = await this.reindexNft(
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

      // TODO: I wonder if this would have the same effect as lines 120-126
      // await this.prisma.candyMachineReceipt.create({
      //   data: { ...receiptData, user: { connect: { id: userId } } },
      // });

      this.heliusService.subscribeTo(metadata.mintAddress.toString());
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

  async reindexNft(
    metadata: Metadata<JsonMetadata<string>>,
    collectionMetadata: JsonMetadata,
    walletAddress: string,
    candMachineAddress: string,
  ) {
    try {
      await Promise.all([
        delegateAuthority(
          this.metaplex,
          new PublicKey(candMachineAddress),
          metadata.collection.address,
          findRarityTrait(collectionMetadata).toString(),
          metadata.mintAddress,
        ),
        verifyMintCreator(this.metaplex, metadata.mintAddress),
      ]);
    } catch (e) {
      console.error(e);
    }
    return await this.prisma.nft.update({
      where: { address: metadata.mintAddress.toString() },
      include: { owner: { select: { userId: true } } },
      data: {
        // TODO v2: this should fetch the info on when the owner changed from chain
        ownerChangedAt: new Date(0),
        owner: {
          connectOrCreate: {
            where: { address: walletAddress },
            create: { address: walletAddress },
          },
        },
        metadata: {
          connectOrCreate: {
            where: { uri: metadata.uri },
            create: {
              collectionName: collectionMetadata.collection.name,
              uri: metadata.uri,
              isUsed: findUsedTrait(collectionMetadata),
              isSigned: findSignedTrait(collectionMetadata),
              rarity: findRarityTrait(collectionMetadata),
            },
          },
        },
      },
    });
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
