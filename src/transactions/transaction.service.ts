import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  Transaction,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from '@solana/web3.js';
import { ComicStateArgs } from 'dreader-comic-verse';
import { metaplex, umi } from '../utils/metaplex';
import { PrismaService } from 'nestjs-prisma';
import {
  constructChangeComicStateTransaction,
  constructChangeCoreComicStateTransaction,
} from '../candy-machine/instructions';
import { RARITY_MAP } from '../constants';
import { constructDelegateCreatorTransaction } from '../candy-machine/instructions/delegate-creator';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenStandard } from '@prisma/client';
import {
  Umi,
  publicKey,
  PublicKey as UmiPublicKey,
} from '@metaplex-foundation/umi';
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

  async createChangeComicStateTransaction(
    mint: PublicKey,
    feePayer: PublicKey,
    newState: ComicStateArgs,
    userId?: number,
  ): Promise<string | null> {
    const { candyMachine, metadata, digitalAsset } =
      await this.prisma.collectibleComic.findUnique({
        where: { address: mint.toString() },
        include: {
          metadata: {
            include: { collection: true },
          },
          candyMachine: true,
          digitalAsset: { include: { owner: { select: { userId: true } } } },
        },
      });

    const { ownerAddress, owner: user } = digitalAsset;
    if (candyMachine.standard === TokenStandard.Core) {
      const { collection } = metadata;
      if (newState == ComicStateArgs.Use && user.userId != userId) {
        throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED_UNWRAP);
      }

      // Fetch asset from onchain in case our database is out of sync
      const assetData = await fetchAssetV1(umi, publicKey(mint));
      const offChainMetadata = await fetchOffChainMetadata(assetData.uri);
      let isUsed = findUsedTrait(offChainMetadata);
      let isSigned = findSignedTrait(offChainMetadata);

      let signer: UmiPublicKey;
      if (newState === ComicStateArgs.Sign) {
        if (isSigned) {
          throw new BadRequestException(ERROR_MESSAGES.COMIC_ALREADY_SIGNED);
        }
        if (
          feePayer.toString() != collection.creatorAddress &&
          feePayer.toString() != collection.creatorBackupAddress
        ) {
          throw new BadRequestException(
            ERROR_MESSAGES.ONLY_VERIFIED_CREATOR_CAN_SIGN,
          );
        }
        isSigned = true;
        signer = publicKey(feePayer);
      } else {
        if (assetData.owner.toString() !== ownerAddress) {
          throw new UnauthorizedException(
            ERROR_MESSAGES.UNAUTHORIZED_CHANGE_COMIC_STATE,
          );
        }
        // Currently by default user is opted in to not sign unwrap tx and we sign it on behalf of user to unwrap the asset
        signer = umi.identity.publicKey;
        isUsed = true;
      }

      const itemMetadata =
        await this.prisma.collectibleComicMetadata.findUnique({
          where: {
            isUsed_isSigned_rarity_collectionAddress: {
              isUsed,
              isSigned,
              rarity: findRarityTrait(offChainMetadata),
              collectionAddress: metadata.collectionAddress,
            },
          },
        });

      const isUnwrap = newState === ComicStateArgs.Use;
      const nonceArgs = isUnwrap
        ? await this.nonceService.getNonce()
        : undefined;

      const transaction = await constructChangeCoreComicStateTransaction(
        this.umi,
        signer,
        publicKey(metadata.collectionAddress),
        publicKey(mint),
        itemMetadata.uri,
        nonceArgs,
      );
      if (isUnwrap) {
        const decodedTransaction = VersionedTransaction.deserialize(
          Buffer.from(transaction, 'base64'),
        );

        decodedTransaction.sign([this.metaplex.identity()]);
        await this.prisma.collectibleComic.update({
          where: { address: mint.toString() },
          data: {
            uri: itemMetadata.uri,
          },
        });
        await this.metaplex.connection.sendTransaction(decodedTransaction);
        return;
      }

      return transaction;
    }

    const owner = new PublicKey(ownerAddress);
    const collectionMintPubKey = new PublicKey(metadata.collectionAddress);
    const candyMachinePubKey = new PublicKey(candyMachine.address);
    const numberedRarity = RARITY_MAP[metadata.rarity];

    return await constructChangeComicStateTransaction(
      this.metaplex,
      owner,
      collectionMintPubKey,
      candyMachinePubKey,
      numberedRarity,
      mint,
      feePayer,
      newState,
    );
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
