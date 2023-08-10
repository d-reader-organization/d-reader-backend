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
import { SAGA_COLLECTION_ADDRESS } from '../constants';

@Injectable()
export class WalletService {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {
    this.metaplex = metaplex;
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
    const unsyncedMetadatas = onChainMetadatas.filter(
      (metadata) =>
        this.findOurCandyMachine(candyMachines, metadata) &&
        !doesWalletIndexCorrectly(metadata),
    );

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
    return candyMachines.find((cm) =>
      this.metaplex
        .candyMachines()
        .pdas()
        .authority({ candyMachine: new PublicKey(cm.address) })
        .equals(metadata.creators[0].address),
    )?.address;
  }

  async reindexNft(
    metadata: Metadata<JsonMetadata<string>>,
    collectionMetadata: JsonMetadata,
    walletAddress: string,
  ) {
    await this.prisma.nft.update({
      where: { address: metadata.mintAddress.toString() },
      data: {
        // TODO v1: this should fetch the info on when the owner changed from chain
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
