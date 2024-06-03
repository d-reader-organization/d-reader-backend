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
import { MIN_COMPUTE_PRICE_IX } from '../../constants';

export async function constructInitializeComicAuthorityInstruction(
  metaplex: Metaplex,
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  rarity: ComicRarity,
  comicStates: ComicStates,
) {
  const recordAuthority = pda(
    [
      Buffer.from(PUB_AUTH_TAG),
      candyMachineAddress.toBuffer(),
      collectionMint.toBuffer(),
    ],
    COMIC_VERSE_ID,
  );
  const rarityString = ComicRarity[rarity].toLowerCase();
  const authority = pda(
    [
      Buffer.from(AUTH_TAG + rarityString),
      candyMachineAddress.toBuffer(),
      collectionMint.toBuffer(),
    ],
    COMIC_VERSE_ID,
  );
  const accounts: InitializeAuthorityInstructionAccounts = {
    authority,
    recordAuthority,
    generator: candyMachineAddress,
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
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  rarity: ComicRarity,
  comicStates: ComicStates,
) {
  const instruction = await constructInitializeComicAuthorityInstruction(
    metaplex,
    candyMachineAddress,
    collectionMint,
    rarity,
    comicStates,
  );
  const tx = new Transaction().add(MIN_COMPUTE_PRICE_IX, instruction);
  await sendAndConfirmTransaction(metaplex.connection, tx, [
    metaplex.identity(),
  ]);
}
