import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  InitializeRecordAuthorityInstructionAccounts,
  InitializeRecordAuthorityInstructionArgs,
  createInitializeRecordAuthorityInstruction,
} from 'dreader-comic-verse';
import { PUB_AUTH_TAG, pda } from './pda';
import { MIN_COMPUTE_PRICE_IX } from '../../constants';

export async function constructInitializeRecordAuthorityInstruction(
  metaplex: Metaplex,
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  creator: PublicKey,
  creatorAuthority: PublicKey,
  maxSignatures: number,
) {
  const collectionMetadata = metaplex
    .nfts()
    .pdas()
    .metadata({ mint: collectionMint });

  const recordAuthority = pda(
    [
      Buffer.from(PUB_AUTH_TAG),
      candyMachineAddress.toBuffer(),
      collectionMint.toBuffer(),
    ],
    COMIC_VERSE_ID,
  );

  const collectionTokenAccount: PublicKey = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({
      mint: collectionMint,
      owner: metaplex.identity().publicKey,
    });
  const accounts: InitializeRecordAuthorityInstructionAccounts = {
    collectionMint: collectionMint,
    generator: candyMachineAddress,
    systemProgram: SystemProgram.programId,
    recordAuthority,
    updateAuthority: metaplex.identity().publicKey,
    tokenAccount: collectionTokenAccount,
    metadata: collectionMetadata,
    creator,
    creatorAuthority,
  };

  const args: InitializeRecordAuthorityInstructionArgs = {
    maxSignatures,
  };

  return createInitializeRecordAuthorityInstruction(accounts, args);
}

export async function initializeRecordAuthority(
  metaplex: Metaplex,
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  creator: PublicKey,
  creatorAuthority: PublicKey,
  maxSignature: number,
) {
  const instruction = await constructInitializeRecordAuthorityInstruction(
    metaplex,
    candyMachineAddress,
    collectionMint,
    creator,
    creatorAuthority,
    maxSignature,
  );
  const tx = new Transaction().add(MIN_COMPUTE_PRICE_IX, instruction);
  await sendAndConfirmTransaction(metaplex.connection, tx, [
    metaplex.identity(),
  ]);
}
