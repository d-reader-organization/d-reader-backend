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
  REFERRAL_REWARD_LIMIT,
  SAGA_COLLECTION_ADDRESS,
} from '../constants';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Nft, Prisma, User } from '@prisma/client';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { sortBy } from 'lodash';
import { IndexedNft } from './dto/types';
import { Referee } from '../types/shared';
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

  doesWalletIndexCorrectly(metadata: Metadata, nfts: Nft[]) {
    return nfts.find((nft) => nft.address === metadata.mintAddress.toString());
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

    const unsyncedMetadatas = onChainMetadatas.filter((metadata) => {
      return (
        this.findOurCandyMachine(candyMachines, metadata) &&
        !this.doesWalletIndexCorrectly(metadata, nfts)
      );
    });

    for (const metadata of unsyncedMetadatas) {
      const collectionMetadata = await fetchOffChainMetadata(metadata.uri);

      const nft = await this.prisma.nft.findFirst({
        where: { address: metadata.mintAddress.toString() },
      });
      const candyMachine = this.findOurCandyMachine(candyMachines, metadata);

      let indexedNft: IndexedNft;
      if (nft) {
        indexedNft = await this.reindexNft(
          metadata,
          collectionMetadata,
          address,
        );
      } else {
        indexedNft = await this.heliusService.indexNft(
          metadata,
          collectionMetadata,
          address,
          candyMachine,
        );
      }

      const UNKNOWN = 'UNKOWN';
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

      // TODO: I wonder if this would have the same effect as lines 120-126
      // await this.prisma.candyMachineReceipt.create({
      //   data: { ...receiptData, user: { connect: { id: userId } } },
      // });

      this.heliusService.subscribeTo(metadata.mintAddress.toString());
    }
  }

  findOurCandyMachine(
    candyMachines: { address: string }[],
    metadata: Metadata,
  ) {
    const candyMachine = candyMachines.find(
      (cm) =>
        metadata?.creators?.length > 0 &&
        this.metaplex
          .candyMachines()
          .pdas()
          .authority({ candyMachine: new PublicKey(cm.address) })
          .equals(metadata.creators[0].address),
    );
    return candyMachine?.address;
  }

  async rewardUserWallet(wallets: Prisma.WalletCreateInput[], label: string) {
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

  async checkIfRewardClaimed(userId: number) {
    const receipt = await this.prisma.candyMachineReceipt.findFirst({
      where: { label: FREE_MINT_GROUP_LABEL, userId },
    });
    return !!receipt;
  }

  checkIfUserIsEligibleForReferrerReward(
    user: User & { referrals: Referee[] },
    referralLimit = REFERRAL_REWARD_LIMIT,
  ) {
    const verifiedReferees = user.referrals.filter(
      (referee) => referee.emailVerifiedAt && referee.wallets.length,
    );
    const isRefereesVerified = verifiedReferees.length >= referralLimit;
    return isRefereesVerified && !user.referCompeletedAt;
  }

  async reindexNft(
    metadata: Metadata<JsonMetadata<string>>,
    collectionMetadata: JsonMetadata,
    walletAddress: string,
  ) {
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
