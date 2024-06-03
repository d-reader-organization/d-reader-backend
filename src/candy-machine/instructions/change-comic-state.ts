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
  TransactionMessage,
  VersionedTransaction,
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
import { updateV1 } from '@metaplex-foundation/mpl-core';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { NonceAccountArgs } from '../../nonce/types';
import { fromWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';

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
  const latestBlockhash = await metaplex.connection.getLatestBlockhash(
    'confirmed',
  );
  const transactionMessage = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [MIN_COMPUTE_PRICE_IX, changeComicStateInstruction],
  }).compileToV0Message([]);
  const tx = new VersionedTransaction(transactionMessage);

  const rawTransaction = Buffer.from(tx.serialize());
  return rawTransaction.toString('base64');
}

export async function constructChangeCoreComicStateTransaction(
  umi: Umi,
  signer: UmiPublicKey,
  collectionMint: UmiPublicKey,
  asset: UmiPublicKey,
  newUri: string,
  nonceArgs?: NonceAccountArgs,
) {
  const payer = createNoopSigner(signer);
  const updateAssetBuilder = await constructUpdateCoreNftTransaction(
    umi,
    collectionMint,
    asset,
    newUri,
  );
  let builder = transactionBuilder()
    .add(setComputeUnitPrice(umi, { microLamports: MIN_COMPUTE_PRICE }))
    .add(updateAssetBuilder);

  if (nonceArgs) {
    const advanceNonceInstruction = fromWeb3JsInstruction(
      SystemProgram.nonceAdvance({
        noncePubkey: new PublicKey(nonceArgs.address),
        authorizedPubkey: new PublicKey(umi.identity.publicKey.toString()),
      }),
    );

    builder = builder.prepend({
      instruction: advanceNonceInstruction,
      signers: [umi.identity],
      bytesCreatedOnChain: 0,
    });
    builder = builder.setBlockhash(nonceArgs.nonce);
  }

  const transaction = await builder.buildAndSign({ ...umi, payer });
  return base64.deserialize(umi.transactions.serialize(transaction))[0];
}

export async function constructUpdateCoreNftTransaction(
  umi: Umi,
  collectionMint: UmiPublicKey,
  asset: UmiPublicKey,
  newUri: string,
) {
  const updateAssetBuilder = updateV1(umi, {
    asset,
    authority: umi.identity,
    newUri,
    collection: collectionMint,
    newName: none(),
  });
  return updateAssetBuilder;
}
