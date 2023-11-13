import { Metaplex, WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { metaplex } from '../utils/metaplex';

export class CreatorTransactionService {
  private readonly metaplex: Metaplex;
  constructor() {
    this.metaplex = metaplex;
  }

  async createTippingTransaction(
    user: PublicKey,
    tippingAddress: PublicKey,
    amount: number,
    mint: PublicKey,
  ) {
    if (!mint.equals(WRAPPED_SOL_MINT)) {
      throw new Error('Unsupported tipping currency !');
    }

    const instruction = SystemProgram.transfer({
      fromPubkey: user,
      toPubkey: tippingAddress,
      lamports: amount,
    });
    const latestBlockhash = await this.metaplex.connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: user,
      ...latestBlockhash,
    }).add(instruction);
    const rawTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    return rawTransaction.toString('base64');
  }
}
