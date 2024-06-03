import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { PUB_AUTH_TAG, pda } from './pda';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  DelegateCreatorInstructionAccounts,
  createDelegateCreatorInstruction,
} from 'dreader-comic-verse';
import { Transaction } from '@solana/web3.js';
import { MIN_COMPUTE_PRICE_IX } from '../../constants';

export async function constructDelegateCreatorInstruction(
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  newCreator: PublicKey,
  creatorAuthority: PublicKey,
) {
  const recordAuthority = pda(
    [
      Buffer.from(PUB_AUTH_TAG),
      candyMachineAddress.toBuffer(),
      collectionMint.toBuffer(),
    ],
    COMIC_VERSE_ID,
  );

  const accounts: DelegateCreatorInstructionAccounts = {
    recordAuthority,
    generator: candyMachineAddress,
    collectionMint,
    creatorAuthority,
    newCreator,
  };
  return createDelegateCreatorInstruction(accounts);
}

export async function constructDelegateCreatorTransaction(
  metaplex: Metaplex,
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  newCreator: PublicKey,
  creatorAuthority: PublicKey,
) {
  const instruction = await constructDelegateCreatorInstruction(
    candyMachineAddress,
    collectionMint,
    newCreator,
    creatorAuthority,
  );

  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: creatorAuthority,
    ...latestBlockhash,
  }).add(MIN_COMPUTE_PRICE_IX, instruction);

  const rawTransaction = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return rawTransaction.toString('base64');
}
