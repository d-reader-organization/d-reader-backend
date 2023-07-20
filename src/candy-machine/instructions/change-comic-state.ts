import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { AUTH_TAG, PUB_AUTH_TAG, pda } from './pda';
import {
  PROGRAM_ID as COMIC_VERSE_ID,
  ChangeComicStateInstructionAccounts,
  ComicRarity,
  ComicStateArgs,
  createChangeComicStateInstruction,
} from 'dreader-comic-verse';
import { Transaction } from '@solana/web3.js';

export async function constructChangeComicStateInstruction(
  metaplex: Metaplex,
  collectionMint: PublicKey,
  candyMachineAddress: PublicKey,
  rarity: ComicRarity,
  mint: PublicKey,
  signer: PublicKey,
  owner: PublicKey,
  newState: ComicStateArgs,
) {
  const rarityString = rarity.toString().toLowerCase();
  const authority = await pda(
    [Buffer.from(AUTH_TAG + rarityString), collectionMint.toBuffer()],
    COMIC_VERSE_ID,
  );
  const recordAuthority = await pda(
    [Buffer.from(PUB_AUTH_TAG), collectionMint.toBuffer()],
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
    candyMachine: candyMachineAddress,
    tokenAccount,
    recordAuthority,
    signer,
  };

  return createChangeComicStateInstruction(accounts, {
    rarity,
    state: newState,
  });
}

export async function constructChangeComicStateTransaction(
  metaplex: Metaplex,
  owner: PublicKey,
  collectionMint: PublicKey,
  candyMachineAddress: PublicKey,
  rarity: ComicRarity,
  mint: PublicKey,
  feePayer: PublicKey,
  newState: ComicStateArgs,
) {
  const instruction = await constructChangeComicStateInstruction(
    metaplex,
    collectionMint,
    candyMachineAddress,
    rarity,
    mint,
    feePayer,
    owner,
    newState,
  );
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();

  const tx = new Transaction({
    feePayer,
    ...latestBlockhash,
  }).add(instruction);

  const rawTransaction = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return rawTransaction.toString('base64');
}
