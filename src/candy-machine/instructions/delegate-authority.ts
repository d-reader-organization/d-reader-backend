import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { AUTH_TAG, pda } from './pda';
import {
  AssignAuthorityToProgramInstructionAccounts,
  PROGRAM_ID as COMIC_VERSE_ID,
  ComicRarity,
  createAssignAuthorityToProgramInstruction,
} from 'dreader-comic-verse';
import {
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  AUTH_RULES,
  AUTH_RULES_ID,
  MIN_COMPUTE_PRICE_IX,
} from '../../constants';

export async function constructDelegateAuthorityInstruction(
  metaplex: Metaplex,
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  rarity: ComicRarity,
  mint: PublicKey,
) {
  const rarityString = ComicRarity[rarity].toLowerCase();
  const authority = pda(
    [
      Buffer.from(AUTH_TAG + rarityString),
      candyMachineAddress.toBuffer(),
      collectionMint.toBuffer(),
    ],
    COMIC_VERSE_ID,
  );
  const metadata = metaplex.nfts().pdas().metadata({ mint });
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata().address;

  const accounts: AssignAuthorityToProgramInstructionAccounts = {
    authority,
    updateAuthority: metaplex.identity().publicKey,
    tokenMetadataProgram,
    generator: candyMachineAddress,
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

export async function verifyMintCreator(metaplex: Metaplex, mint: PublicKey) {
  await metaplex.nfts().verifyCreator({
    mintAddress: mint,
    creator: metaplex.identity(),
  });
}

export async function delegateAuthority(
  metaplex: Metaplex,
  candyMachineAddress: PublicKey,
  collectionMint: PublicKey,
  rarity: string,
  mint: PublicKey,
) {
  const instruction = await constructDelegateAuthorityInstruction(
    metaplex,
    candyMachineAddress,
    collectionMint,
    ComicRarity[rarity],
    mint,
  );
  const tx = new Transaction().add(MIN_COMPUTE_PRICE_IX, instruction);
  await sendAndConfirmTransaction(metaplex.connection, tx, [
    metaplex.identity(),
  ]);
}
