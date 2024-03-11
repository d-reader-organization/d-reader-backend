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
  MIN_COMPUTE_PRICE_IX,
} from '../../constants';
import {
  Umi,
  createNoopSigner,
  publicKey,
  some,
} from '@metaplex-foundation/umi';
import {
  UpdateArgsArgs,
  fetchMerkleTree,
  getAssetWithProof,
  updateMetadata,
} from '@metaplex-foundation/mpl-bubblegum';
import { base64 } from '@metaplex-foundation/umi/serializers';
import {
  fetchOffChainMetadata,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';

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

export async function constructChangeCompressedComicStateTransaction(
  umi: Umi,
  signer: PublicKey,
  mint: PublicKey,
  candMachineAddress: PublicKey,
  collectionMint: PublicKey,
  uri: string,
  newState: ComicStateArgs,
) {
  const assetWithProof = await getAssetWithProof(umi, publicKey(mint));
  if (
    newState === ComicStateArgs.Use &&
    !signer.equals(new PublicKey(assetWithProof.leafOwner))
  ) {
    //todo: sync database for this cnft
    throw Error('Invalid Owner');
  }

  const offChainMetadata = await fetchOffChainMetadata(
    assetWithProof.metadata.uri,
  );

  const isUsed = findUsedTrait(offChainMetadata);
  const isSigned = findSignedTrait(offChainMetadata);

  const newSignedState = newState === ComicStateArgs.Sign;
  const newUsedState = newState === ComicStateArgs.Use;

  if ((isUsed && newUsedState) || (isSigned && newSignedState)) {
    throw new Error('Invalid Comic State');
  }

  const merkleTree = await fetchMerkleTree(umi, publicKey(candMachineAddress), {
    commitment: 'confirmed',
  });

  const updateArgs: UpdateArgsArgs = {
    uri: some(uri),
  };

  const { canopy } = merkleTree;
  const canopyDepth = canopy.length;
  const { proof } = assetWithProof;

  const payer = createNoopSigner(publicKey(signer));
  const transaction = await updateMetadata(umi, {
    ...assetWithProof,
    proof: proof.slice(0, proof.length - canopyDepth),
    currentMetadata: assetWithProof.metadata,
    collectionMint: publicKey(collectionMint),
    updateArgs,
    payer,
  }).buildAndSign(umi);

  return base64.deserialize(umi.transactions.serialize(transaction))[0];
}
