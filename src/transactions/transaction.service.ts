import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  Transaction,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getIdentitySignature,
  getTreasuryUmiPublicKey,
  metaplex,
  umi,
} from '../utils/metaplex';
import { PrismaService } from 'nestjs-prisma';
import { constructChangeCoreComicStateTransaction } from '../candy-machine/instructions';
import { constructDelegateCreatorTransaction } from '../candy-machine/instructions/delegate-creator';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenStandard } from '@prisma/client';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { fetchAssetV1 } from '@metaplex-foundation/mpl-core';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../utils/nft-metadata';
import { NonceService } from '../nonce/nonce.service';
import { ERROR_MESSAGES } from '../utils/errors';

@Injectable()
export class TransactionService {
  private readonly metaplex: Metaplex;
  private readonly umi: Umi;

  constructor(
    private readonly prisma: PrismaService,
    private readonly nonceService: NonceService,
  ) {
    this.metaplex = metaplex;
    this.umi = umi;
  }

  async createTransferTransaction(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: number,
    tokenAddress: PublicKey,
  ) {
    if (!tokenAddress.equals(WRAPPED_SOL_MINT)) {
      throw new Error(ERROR_MESSAGES.CURRENCY_NOT_SUPPORTED);
    }

    const instruction = SystemProgram.transfer({
      fromPubkey: senderAddress,
      toPubkey: receiverAddress,
      lamports: amount,
    });
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: senderAddress,
      ...latestBlockhash,
    }).add(instruction);
    const rawTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    return rawTransaction.toString('base64');
  }

  async signComic(assetAddress: string) {
    const { candyMachine, metadata } =
      await this.prisma.collectibleComic.findUnique({
        where: { address: assetAddress },
        include: {
          metadata: { include: { collection: true } },
          candyMachine: true,
        },
      });

    if (candyMachine.standard !== TokenStandard.Core) {
      throw new UnauthorizedException(
        ERROR_MESSAGES.UNAUTHORIZED_CHANGE_COMIC_STATE,
      );
    }

    const assetData = await fetchAssetV1(umi, publicKey(assetAddress));
    const offChainMetadata = await fetchOffChainMetadata(assetData.uri);
    const isUsed = findUsedTrait(offChainMetadata);
    const rarity = findRarityTrait(offChainMetadata);
    const isSigned = findSignedTrait(offChainMetadata);

    if (isSigned) {
      throw new BadRequestException(ERROR_MESSAGES.COMIC_ALREADY_SIGNED);
    }

    const itemMetadata = await this.prisma.collectibleComicMetadata.findUnique({
      where: {
        isUsed_isSigned_rarity_collectionAddress: {
          isUsed,
          isSigned: true,
          rarity,
          collectionAddress: metadata.collectionAddress,
        },
      },
    });

    const transaction = await constructChangeCoreComicStateTransaction(
      this.umi,
      publicKey(metadata.collection.creatorAddress), // This will be backend identity for authorized creators
      publicKey(metadata.collectionAddress),
      publicKey(assetAddress),
      itemMetadata.uri,
    );

    return transaction;
  }

  async unwrapComic(assetAddress: string, userId: number) {
    const { candyMachine, metadata, digitalAsset } =
      await this.prisma.collectibleComic.findUnique({
        where: { address: assetAddress },
        include: {
          metadata: { include: { collection: true } },
          candyMachine: true,
          digitalAsset: { include: { owner: { select: { userId: true } } } },
        },
      });

    const { ownerAddress, owner: user } = digitalAsset;

    if (candyMachine.standard !== TokenStandard.Core) {
      throw new UnauthorizedException(
        ERROR_MESSAGES.UNAUTHORIZED_CHANGE_COMIC_STATE,
      );
    }

    // Fetch asset from onchain in case our database is out of sync
    const assetData = await fetchAssetV1(umi, publicKey(assetAddress));
    const offChainMetadata = await fetchOffChainMetadata(assetData.uri);
    const rarity = findRarityTrait(offChainMetadata);
    const isSigned = findSignedTrait(offChainMetadata);

    const itemMetadata = await this.prisma.collectibleComicMetadata.findUnique({
      where: {
        isUsed_isSigned_rarity_collectionAddress: {
          isUsed: true,
          isSigned,
          rarity,
          collectionAddress: metadata.collectionAddress,
        },
      },
    });

    if (user.userId != userId || assetData.owner.toString() !== ownerAddress) {
      throw new UnauthorizedException(
        ERROR_MESSAGES.UNAUTHORIZED_CHANGE_COMIC_STATE,
      );
    }

    const nonceArgs = await this.nonceService.getNonce();

    const treasury = getTreasuryUmiPublicKey();
    const transaction = await constructChangeCoreComicStateTransaction(
      this.umi,
      treasury,
      publicKey(metadata.collectionAddress),
      publicKey(assetAddress),
      itemMetadata.uri,
      nonceArgs,
    );

    const decodedTransaction = VersionedTransaction.deserialize(
      Buffer.from(transaction, 'base64'),
    );

    const signedTransaction = getIdentitySignature(decodedTransaction);
    await this.prisma.collectibleComic.update({
      where: { address: assetAddress },
      data: { uri: itemMetadata.uri },
    });

    await this.metaplex.connection.sendTransaction(signedTransaction);

    /**
     * TODO: for legacy comic change state, assign backend identity as authority in the contract
     **/

    // const owner = new PublicKey(ownerAddress);
    // const collectionMintPubKey = new PublicKey(metadata.collectionAddress);
    // const candyMachinePubKey = new PublicKey(candyMachine.address);
    // const numberedRarity = RARITY_MAP[metadata.rarity];

    //   return await constructChangeComicStateTransaction(
    //     this.metaplex,
    //     owner,
    //     collectionMintPubKey,
    //     candyMachinePubKey,
    //     numberedRarity,
    //     mint,
    //     feePayer,
    //     newState,
    //   );
  }

  async createDelegateCreatorTransaction(
    candyMachineAddress: PublicKey,
    newCreator: PublicKey,
    creatorAuthority: PublicKey,
  ) {
    const collection = await this.prisma.collectibleComicCollection.findFirst({
      where: {
        candyMachines: { some: { address: candyMachineAddress.toString() } },
      },
    });
    return await constructDelegateCreatorTransaction(
      this.metaplex,
      candyMachineAddress,
      new PublicKey(collection.address),
      newCreator,
      creatorAuthority,
    );
  }
}
