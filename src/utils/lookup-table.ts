import { Metaplex } from '@metaplex-foundation/js';
import {
  AddressLookupTableProgram,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

export async function createLookUpTable(
  metaplex: Metaplex,
  addresses: PublicKey[],
) {
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const currentSlot = await metaplex.connection.getSlot('recent');
  const slots = await metaplex.connection.getBlocks(currentSlot - 20);
  const [instruction, address] = AddressLookupTableProgram.createLookupTable({
    authority: metaplex.identity().publicKey,
    payer: metaplex.identity().publicKey,
    recentSlot: slots[0],
  });
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: metaplex.identity().publicKey,
    authority: metaplex.identity().publicKey,
    lookupTable: address,
    addresses: [...addresses, SystemProgram.programId],
  });

  const messageV0 = new TransactionMessage({
    payerKey: metaplex.identity().publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [instruction, extendInstruction],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([metaplex.identity()]);
  const txid = await metaplex.connection.sendTransaction(transaction);
  const confirmation = await metaplex.connection.confirmTransaction({
    signature: txid,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });
  console.log(confirmation);
  console.log(address.toBase58());
  return address;
}
