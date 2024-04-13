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
import { Injectable } from '@nestjs/common';
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
      throw new Error('Unsupported tipping currency !');
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
    const {
      ownerAddress,
      collectionNftAddress,
      candyMachine,
      collectionNft,
      metadata,
      name,
      owner: user,
    } = await this.prisma.nft.findUnique({
      where: { address: mint.toString() },
      include: {
        metadata: true,
        candyMachine: true,
        collectionNft: { include: { comicIssue: true } },
        owner: { select: { userId: true } },
      },
    });

    if (candyMachine.standard === TokenStandard.Core) {
      const { comicIssue } = collectionNft;
      if (user.userId != userId) {
        throw new Error(
          `Unauthorized to unwrap the comic, make sure you've correct wallet connected to the app!`,
        );
      }

      // Fetch asset from onchain in case our database is out of sync
      const assetData = await fetchAssetV1(umi, publicKey(mint));
      const offChainMetadata = await fetchOffChainMetadata(assetData.uri);
      let isUsed = findUsedTrait(offChainMetadata);
      let isSigned = findSignedTrait(offChainMetadata);

      let signer: UmiPublicKey;
      if (newState === ComicStateArgs.Sign) {
        if (isSigned) {
          throw new Error('Comic is already signed');
        }
        if (feePayer.toString() != comicIssue.creatorAddress) {
          throw new Error('Only verified creator can sign a comic');
        }
        isSigned = true;
        signer = publicKey(feePayer);
      } else {
        if (assetData.owner.toString() !== ownerAddress) {
          throw new Error(`Unauthorized to change comic state`);
        }
        // Currently by default user is opted in to not sign unwrap tx and we sign it on behalf of user to unwrap the asset
        signer = umi.identity.publicKey;
        isUsed = true;
      }

      const itemMetadata = await this.prisma.metadata.findFirst({
        where: {
          isUsed,
          isSigned,
          rarity: findRarityTrait(offChainMetadata),
          collectionName: name.split('#')[0].trimEnd(),
        },
      });

      const isUnwrap = newState === ComicStateArgs.Use;
      const nonceArgs = isUnwrap
        ? await this.nonceService.getNonce()
        : undefined;

      const transaction = await constructChangeCoreComicStateTransaction(
        this.umi,
        signer,
        publicKey(collectionNftAddress),
        publicKey(mint),
        itemMetadata.uri,
        nonceArgs,
      );
      if (isUnwrap) {
        const decodedTransaction = VersionedTransaction.deserialize(
          Buffer.from(transaction, 'base64'),
        );

        decodedTransaction.sign([this.metaplex.identity()]);
        await this.metaplex.connection.sendTransaction(decodedTransaction, {
          preflightCommitment: 'processed',
        });

        await this.prisma.nft.update({
          where: { address: mint.toString() },
          data: {
            uri: itemMetadata.uri,
          },
        });
        return;
      }

      return transaction;
    }

    const owner = new PublicKey(ownerAddress);
    const collectionMintPubKey = new PublicKey(collectionNftAddress);
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
    const collection = await this.prisma.collectionNft.findFirst({
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
