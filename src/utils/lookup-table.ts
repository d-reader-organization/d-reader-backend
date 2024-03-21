import { Metaplex } from '@metaplex-foundation/js';
import {
  AddressLookupTableProgram,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { MIN_COMPUTE_PRICE_IX } from '../constants';

export async function createLookupTable(
  metaplex: Metaplex,
  addresses: PublicKey[],
) {
  try {
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
      instructions: [MIN_COMPUTE_PRICE_IX, instruction, extendInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([metaplex.identity()]);
    const txid = await metaplex.connection.sendTransaction(transaction);

    await metaplex.connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    return address;
  } catch (e) {
    console.error('Create Lookup Table failed :', e);
  }
}
