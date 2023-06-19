import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { AUTH_TAG, pda } from './pda';
import {
  AssignAuthorityToProgramInstructionAccounts,
  PROGRAM_ID as COMIC_VERSE_ID,
  ComicRarity,
  createAssignAuthorityToProgramInstruction,
} from 'dreader-comic-verse';

export async function delegateAuthority(
  metaplex: Metaplex,
  collectionMint: PublicKey,
  rarity: ComicRarity,
  mint: PublicKey,
) {
  const rarityString = ComicRarity[rarity].toLowerCase(); //  check
  const authority = await pda(
    [Buffer.from(AUTH_TAG + rarityString), collectionMint.toBuffer()],
    COMIC_VERSE_ID,
  );
  const metadata = metaplex.nfts().pdas().metadata({ mint });
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata().address;

  const accounts: AssignAuthorityToProgramInstructionAccounts = {
    authority,
    updateAuthority: metaplex.identity().publicKey,
    tokenMetadataProgram,
    collectionMint,
    metadata,
  };
  return createAssignAuthorityToProgramInstruction(accounts, { rarity });
}
