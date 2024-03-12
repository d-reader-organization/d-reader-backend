import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { ComicStateArgs } from 'dreader-comic-verse';
import { metaplex, umi } from '../utils/metaplex';
import { PrismaService } from 'nestjs-prisma';
import {
  constructChangeComicStateTransaction,
  constructChangeCompressedComicStateTransaction,
} from '../candy-machine/instructions';
import { RARITY_MAP } from '../constants';
import { constructDelegateCreatorTransaction } from '../candy-machine/instructions/delegate-creator';
import { Injectable } from '@nestjs/common';
import { Umi } from '@metaplex-foundation/umi';
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
    eligible?: boolean,
  ) {
    const {
      ownerAddress,
      collectionNftAddress,
      metadata,
      candyMachine,
      collectionNft,
    } = await this.prisma.nft.findUnique({
      where: { address: mint.toString() },
      include: {
        metadata: true,
        candyMachine: true,
        collectionNft: { include: { comicIssue: true } },
      },
    });

    const { address: candyMachineAddress, compressed } = candyMachine;
    const comicIssue = collectionNft.comicIssue;

    const owner = new PublicKey(ownerAddress);
    const collectionMintPubKey = new PublicKey(collectionNftAddress);
    const candyMachinePubKey = new PublicKey(candyMachineAddress);
    const numberedRarity = RARITY_MAP[metadata.rarity];

    if (compressed) {
      if (!eligible && feePayer.equals(metaplex.identity().publicKey)) {
        throw new Error('Wallet is not eligible for unwrapping or signing');
      }

      let isUsed = metadata.isUsed;
      let isSigned = metadata.isSigned;

      let signer = owner;
      if (newState === ComicStateArgs.Sign) {
        if (metadata.isSigned) {
          throw new Error('Comic is already signed');
        }
        if (feePayer.toString() != comicIssue.creatorAddress) {
          throw new Error('Only verified creator can sign a comic');
        }
        isSigned = true;
        signer = feePayer;
      } else {
        if (metadata.isUsed) {
          throw new Error('Comic is already unwrapped');
        }
        isUsed = true;
      }

      const itemMetadata = await this.prisma.metadata.findFirst({
        where: {
          isUsed,
          isSigned,
          rarity: metadata.rarity,
          collectionAddress: collectionNftAddress,
        },
      });

      return await constructChangeCompressedComicStateTransaction(
        this.umi,
        signer,
        mint,
        candyMachinePubKey,
        collectionMintPubKey,
        itemMetadata.uri,
        newState,
      );
    }

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
