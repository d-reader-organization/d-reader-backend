import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { metaplex } from '../utils/metaplex';

export class TransactionService {
  private readonly metaplex: Metaplex;
  constructor() {
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
}
