import { Metaplex } from '@metaplex-foundation/js';
import {
  ComputeBudgetProgram,
  Keypair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { D_PUBLISHER_SYMBOL } from '../../constants';

export async function createCollectionNft(
  metaplex: Metaplex,
  name: string,
  uri: string,
  sellerFeeBasisPoints: number,
  symbol = D_PUBLISHER_SYMBOL,
) {
  const mintKeypair = Keypair.generate();
  const collectionNftTransactionBuilder = await metaplex
    .nfts()
    .builders()
    .create({
      uri,
      name,
      sellerFeeBasisPoints,
      symbol,
      useNewMint: mintKeypair,
      isCollection: true,
    });
  const mintAddress = mintKeypair.publicKey;
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const collectionNftTransaction =
    collectionNftTransactionBuilder.toTransaction(latestBlockhash);

  const instructions: TransactionInstruction[] = [];
  instructions.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 800_000,
    }),
  );
  const transaction = new Transaction({
    feePayer: metaplex.identity().publicKey,
    ...latestBlockhash,
  })
    .add(...instructions)
    .add(collectionNftTransaction);

  transaction.partialSign(metaplex.identity(), mintKeypair);
  const rawTransaction = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  const signature = await metaplex.connection.sendRawTransaction(
    rawTransaction,
  );
  const response = await metaplex.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    'confirmed',
  );
  if (response.value.err) {
    throw new Error('Error creating collection');
  }
  return { name, address: mintAddress };
}
