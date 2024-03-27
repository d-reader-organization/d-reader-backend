import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
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
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { fetchAssetV1 } from '@metaplex-foundation/mpl-core';

@Injectable()
export class TransactionService {
  private readonly metaplex: Metaplex;
  private readonly umi: Umi;

  constructor(private readonly prisma: PrismaService) {
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
  ) {
    const {
      ownerAddress,
      collectionNftAddress,
      candyMachine,
      metadata,
      collectionNft,
      name,
    } = await this.prisma.nft.findUnique({
      where: { address: mint.toString() },
      include: {
        metadata: true,
        candyMachine: true,
        collectionNft: { include: { comicIssue: true } },
      },
    });

    if (candyMachine.standard == TokenStandard.Core) {
      const { comicIssue } = collectionNft;
      let isUsed = metadata.isUsed;
      let isSigned = metadata.isSigned;

      let signer = publicKey(ownerAddress);
      if (newState === ComicStateArgs.Sign) {
        if (metadata.isSigned) {
          throw new Error('Comic is already signed');
        }
        if (feePayer.toString() != comicIssue.creatorAddress) {
          throw new Error('Only verified creator can sign a comic');
        }
        isSigned = true;
        signer = publicKey(feePayer);
      } else {
        if (metadata.isUsed) {
          throw new Error('Comic is already unwrapped');
        }

        // Fetch asset from onchain in case our database is out of sync
        const assetData = await fetchAssetV1(umi, publicKey(mint));

        if (assetData.owner.toString() !== ownerAddress) {
          throw new Error(`Unauthorized to change comic state`);
        }
        isUsed = true;
      }

      const itemMetadata = await this.prisma.metadata.findFirst({
        where: {
          isUsed,
          isSigned,
          rarity: metadata.rarity,
          collectionName: name.split('#')[0].trimEnd(),
        },
      });

      return await constructChangeCoreComicStateTransaction(
        this.umi,
        signer,
        publicKey(collectionNftAddress),
        publicKey(mint),
        itemMetadata.uri,
      );
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
