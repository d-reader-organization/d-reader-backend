import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  createInitializeAuthorityInstruction,
  InitializeAuthorityInstructionAccounts,
  ComicRarity,
  ComicStates,
} from 'dreader-comic-verse';
import { AUTH_TAG, PUB_AUTH_TAG, pda } from './pda';
import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

export async function constructInitializeComicAuthorityInstruction(
  metaplex: Metaplex,
  collectionMint: PublicKey,
  rarity: ComicRarity,
  comicStates: ComicStates,
) {
  const recordAuthority = await pda(
    [Buffer.from(PUB_AUTH_TAG), collectionMint.toBuffer()],
    COMIC_VERSE_ID,
  );
  const rarityString = ComicRarity[rarity].toLowerCase(); //  check
  const authority = await pda(
    [Buffer.from(AUTH_TAG + rarityString), collectionMint.toBuffer()],
    COMIC_VERSE_ID,
  );
  const accounts: InitializeAuthorityInstructionAccounts = {
    authority,
    recordAuthority,
    updateAuthority: metaplex.identity().publicKey,
    collectionMint,
    systemProgram: SystemProgram.programId,
  };
  return createInitializeAuthorityInstruction(accounts, {
    rarity,
    comicStates,
  });
}

export async function initializeAuthority(
  metaplex: Metaplex,
  collectionMint: PublicKey,
  rarity: ComicRarity,
  comicStates: ComicStates,
) {
  const instruction = await constructInitializeComicAuthorityInstruction(
    metaplex,
    collectionMint,
    rarity,
    comicStates,
  );
  const tx = new Transaction().add(instruction);
  await sendAndConfirmTransaction(metaplex.connection, tx, [
    metaplex.identity(),
  ]);
}
