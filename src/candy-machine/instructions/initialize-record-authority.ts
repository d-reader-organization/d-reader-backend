import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { SystemProgram } from '@solana/web3.js';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  InitializeRecordAuthorityInstructionAccounts,
  createInitializeRecordAuthorityInstruction,
} from 'dreader-comic-verse';
import { PUB_AUTH_TAG, pda } from './pda';

export async function constructInitializeRecordAuthorityInstruction(
  metaplex: Metaplex,
  collectionMint: PublicKey,
  creator: PublicKey,
  maxSignatures: number,
) {
  const collectionMetadata = metaplex
    .nfts()
    .pdas()
    .metadata({ mint: collectionMint });

  const recordAuthority = await pda(
    [Buffer.from(PUB_AUTH_TAG), collectionMint.toBuffer()],
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
    systemProgram: SystemProgram.programId,
    recordAuthority,
    updateAuthority: metaplex.identity().publicKey,
    tokenAccount: collectionTokenAccount,
    metadata: collectionMetadata,
    creator,
  };

  return createInitializeRecordAuthorityInstruction(accounts, {
    maxSignatures,
  });
}
