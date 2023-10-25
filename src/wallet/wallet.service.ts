import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { s3Service } from '../aws/s3.service';
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
import { FREE_MINT_GROUP_LABEL, SAGA_COLLECTION_ADDRESS } from '../constants';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Prisma } from '@prisma/client';
import { sortBy } from 'lodash';
import { CandyMachineService } from '../candy-machine/candy-machine.service';

@Injectable()
export class WalletService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly s3: s3Service,
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

    function doesWalletIndexCorrectly(metadata: Metadata) {
      return nfts.find(
        (nft) => nft.address === metadata.mintAddress.toString(),
      );
    }
    const onChainMetadatas = findAllByOwnerResult.filter(isMetadata);
    let unsyncedMetadatas: Metadata<JsonMetadata<string>>[];
    try {
      unsyncedMetadatas = onChainMetadatas.filter((metadata) => {
        return (
          this.findOurCandyMachine(candyMachines, metadata) &&
          !doesWalletIndexCorrectly(metadata)
        );
      });
    } catch (e) {
      console.log(e);
    }
    for (const metadata of unsyncedMetadatas) {
      const collectionMetadata = await fetchOffChainMetadata(metadata.uri);

      const nft = await this.prisma.nft.findFirst({
        where: { address: metadata.mintAddress.toString() },
      });

      if (nft) {
        this.reindexNft(metadata, collectionMetadata, address);
      } else {
        const candyMachine = this.findOurCandyMachine(candyMachines, metadata);
        this.heliusService.indexNft(
          metadata,
          collectionMetadata,
          address,
          candyMachine,
        );
      }
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

  async rewardWallet(userId: number, wallets: Prisma.WalletCreateInput[]) {
    const receipt = await this.prisma.candyMachineReceipt.findFirst({
      where: { label: FREE_MINT_GROUP_LABEL, userId },
    });
    if (receipt) return;
    const candyMachines =
      await this.candyMachineService.findActiveRewardCandyMachine();
    const lastConnectedWallet = sortBy(wallets, (wallet) => wallet.connectedAt);
    const addWallet = candyMachines.map((candyMachine) =>
      this.candyMachineService.addAllowList(
        candyMachine.candyMachineAddress,
        [lastConnectedWallet.at(-1).address],
        FREE_MINT_GROUP_LABEL,
      ),
    );
    await Promise.all(addWallet);
  }

  async reindexNft(
    metadata: Metadata<JsonMetadata<string>>,
    collectionMetadata: JsonMetadata,
    walletAddress: string,
  ) {
    await this.prisma.nft.update({
      where: { address: metadata.mintAddress.toString() },
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
