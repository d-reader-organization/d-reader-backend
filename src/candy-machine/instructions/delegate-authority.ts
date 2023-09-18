import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { AUTH_TAG, pda } from './pda';
import {
  AssignAuthorityToProgramInstructionAccounts,
  PROGRAM_ID as COMIC_VERSE_ID,
  ComicRarity,
  createAssignAuthorityToProgramInstruction,
} from 'dreader-comic-verse';
import { SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram } from '@solana/web3.js';
import { AUTH_RULES, AUTH_RULES_ID } from '../../constants';

export async function constructDelegateAuthorityInstruction(
  metaplex: Metaplex,
  collectionMint: PublicKey,
  rarity: ComicRarity,
  mint: PublicKey,
) {
  const rarityString = ComicRarity[rarity].toLowerCase();
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
    mint,
    authorizationRules: AUTH_RULES,
    authorizationRulesProgram: AUTH_RULES_ID,
    sysvarInstruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    systemProgram: SystemProgram.programId,
  };
  return createAssignAuthorityToProgramInstruction(accounts, { rarity });
}
