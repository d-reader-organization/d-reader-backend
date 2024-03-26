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
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  AUTH_RULES,
  AUTH_RULES_ID,
  MIN_COMPUTE_PRICE,
  MIN_COMPUTE_PRICE_IX,
} from '../../constants';
import {
  Umi,
  PublicKey as UmiPublicKey,
  createNoopSigner,
  none,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import { fetchAssetV1, updateV1 } from 'core-preview';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';

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

  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer,
    ...latestBlockhash,
  }).add(MIN_COMPUTE_PRICE_IX, changeComicStateInstruction);

  const rawTransaction = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return rawTransaction.toString('base64');
}

export async function constructChangeCoreComicStateTransaction(
  umi: Umi,
  owner: UmiPublicKey,
  collectionMint: UmiPublicKey,
  asset: UmiPublicKey,
  newUri: string,
) {
  const assetData = await fetchAssetV1(umi, asset);
  if (assetData.owner.toString() !== owner.toString()) {
    throw new Error(`Unauthorized to change comic state`);
  }

  const builder = transactionBuilder().add(
    setComputeUnitPrice(umi, { microLamports: MIN_COMPUTE_PRICE }),
  );

  const updateAssetBuilder = await constructUpdateCoreNftTransaction(
    umi,
    owner,
    collectionMint,
    asset,
    newUri,
  );
  builder.add(updateAssetBuilder);

  const transaction = await builder.buildAndSign(umi);
  return transaction;
}

export async function constructUpdateCoreNftTransaction(
  umi: Umi,
  owner: UmiPublicKey,
  collectionMint: UmiPublicKey,
  asset: UmiPublicKey,
  newUri: string,
) {
  const payer = createNoopSigner(owner);
  const updateAssetBuilder = updateV1(umi, {
    asset,
    authority: umi.identity,
    newUri,
    collection: collectionMint,
    newName: none(),
    payer,
  });
  return updateAssetBuilder;
}
