import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { AUTH_TAG, PUB_AUTH_TAG, pda } from './pda';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  ChangeComicStateInstructionAccounts,
  ComicRarity,
  ComicStateArgs,
  createChangeComicStateInstruction,
} from 'dreader-comic-verse';
import {
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { AUTH_RULES, AUTH_RULES_ID } from '../../constants';

export async function constructChangeComicStateInstruction(
  metaplex: Metaplex,
  collectionMint: PublicKey,
  candyMachineAddress: PublicKey,
  numberedRarity: ComicRarity,
  mint: PublicKey,
  signer: PublicKey,
  owner: PublicKey,
  newState: ComicStateArgs,
) {
  const rarityString = ComicRarity[numberedRarity].toString().toLowerCase();
  const authority = pda(
    [
      Buffer.from(AUTH_TAG + rarityString),
      candyMachineAddress.toBuffer(),
      collectionMint.toBuffer(),
    ],
    COMIC_VERSE_ID,
  );
  const recordAuthority = pda(
    [
      Buffer.from(PUB_AUTH_TAG),
      candyMachineAddress.toBuffer(),
      collectionMint.toBuffer(),
    ],
    COMIC_VERSE_ID,
  );

  const metadata = metaplex.nfts().pdas().metadata({ mint });

  const tokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
    mint,
    owner,
  });

  const token_metadata_id = metaplex.programs().getTokenMetadata().address;
  const accounts: ChangeComicStateInstructionAccounts = {
    authority: authority,
    tokenMetadataProgram: token_metadata_id,
    collectionMint,
    metadata,
    generator: candyMachineAddress,
    tokenAccount,
    recordAuthority,
    signer,
    mint,
    authorizationRules: AUTH_RULES,
    authorizationRulesProgram: AUTH_RULES_ID,
    sysvarInstruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    systemProgram: SystemProgram.programId,
  };
  return createChangeComicStateInstruction(accounts, {
    rarity: numberedRarity,
    state: newState,
  });
}

export async function constructChangeComicStateTransaction(
  metaplex: Metaplex,
  owner: PublicKey,
  collectionMint: PublicKey,
  candyMachineAddress: PublicKey,
  numberedRarity: ComicRarity,
  mint: PublicKey,
  feePayer: PublicKey,
  newState: ComicStateArgs,
) {
  const changeComicStateInstruction =
    await constructChangeComicStateInstruction(
      metaplex,
      collectionMint,
      candyMachineAddress,
      numberedRarity,
      mint,
      feePayer,
      owner,
      newState,
    );

  const instructions: TransactionInstruction[] = [];
  instructions.push(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 400000,
    }),
  );
  instructions.push(changeComicStateInstruction);
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();

  const tx = new Transaction({
    feePayer,
    ...latestBlockhash,
  }).add(...instructions);

  const rawTransaction = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return rawTransaction.toString('base64');
}
