import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { ComicStateArgs } from 'dreader-comic-verse';
import { metaplex } from '../utils/metaplex';
import { PrismaService } from 'nestjs-prisma';
import { constructChangeComicStateTransaction } from '../candy-machine/instructions';
import { RARITY_MAP } from '../constants';
export class TransactionService {
  private readonly metaplex: Metaplex;
  constructor(private readonly prisma: PrismaService) {
    this.metaplex = metaplex;
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
      candyMachineAddress,
      metadata,
    } = await this.prisma.nft.findUnique({
      where: { address: mint.toString() },
      include: { metadata: true },
    });

    const owner = new PublicKey(ownerAddress);
    const collectionMintPubKey = new PublicKey(collectionNftAddress);
    const candyMachinePubKey = new PublicKey(candyMachineAddress);
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
}
