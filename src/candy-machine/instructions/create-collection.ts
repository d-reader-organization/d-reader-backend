import { Metaplex } from '@metaplex-foundation/js';
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { D_PUBLISHER_SYMBOL, MIN_COMPUTE_PRICE } from '../../constants';
import {
  Creator as CoreCreator,
  createCollectionV1,
  pluginAuthorityPair,
  ruleSet,
} from '@metaplex-foundation/mpl-core';
import { Signer as UmiSigner, Umi, publicKey } from '@metaplex-foundation/umi';
import {
  setComputeUnitLimit,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { NonceAccountArgs } from '../../nonce/types';
import { fromWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';

export async function createCollectionNft(
  metaplex: Metaplex,
  name: string,
  uri: string,
  sellerFeeBasisPoints: number,
  symbol = D_PUBLISHER_SYMBOL,
) {
  const mintKeypair = Keypair.generate();
  const collectionNftTransactionBuilder = await metaplex
    .nfts()
    .builders()
    .create({
      uri,
      name,
      sellerFeeBasisPoints,
      symbol,
      useNewMint: mintKeypair,
      isCollection: true,
    });
  const mintAddress = mintKeypair.publicKey;
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const collectionNftTransaction =
    collectionNftTransactionBuilder.toTransaction(latestBlockhash);

  const instructions: TransactionInstruction[] = [];
  instructions.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 800_000,
    }),
  );
  const transaction = new Transaction({
    feePayer: metaplex.identity().publicKey,
    ...latestBlockhash,
  })
    .add(...instructions)
    .add(collectionNftTransaction);
  transaction.partialSign(metaplex.identity(), mintKeypair);
  const rawTransaction = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  const signature = await metaplex.connection.sendRawTransaction(
    rawTransaction,
  );
  const response = await metaplex.connection.confirmTransaction(
    { signature, ...latestBlockhash },
    'confirmed',
  );
  if (response.value.err) {
    throw new Error('Error creating collection');
  }
  return { name, address: mintAddress };
}

export async function constructCoreCollectionTransaction(
  umi: Umi,
  collection: UmiSigner,
  uri: string,
  onChainName: string,
  sellerFeeBasisPoints: number,
  creators: CoreCreator[],
  nonceArgs?: NonceAccountArgs,
) {
  const collectionBuilder = createCollectionV1(umi, {
    collection,
    uri,
    name: onChainName,
    plugins: [
      pluginAuthorityPair({
        type: 'Royalties',
        data: {
          basisPoints: sellerFeeBasisPoints,
          creators,
          // Change in future if encounters with a marketplace not enforcing royalties
          ruleSet: ruleSet('None'),
        },
      }),
    ],
  });
  const COMPUTE_UNITS = 300_000;

  let builder = setComputeUnitPrice(umi, {
    microLamports: MIN_COMPUTE_PRICE,
  })
    .add(setComputeUnitLimit(umi, { units: COMPUTE_UNITS }))
    .add(collectionBuilder);

  if (nonceArgs) {
    const minContextSlot = await umi.rpc.getSlot({ commitment: 'confirmed' });
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

    await builder.sendAndConfirm(umi, {
      send: { commitment: 'confirmed' },
      confirm: {
        strategy: {
          type: 'durableNonce',
          nonceAccountPubkey: publicKey(nonceArgs.address),
          nonceValue: nonceArgs.nonce,
          minContextSlot,
        },
      },
    });
  } else {
    await builder.sendAndConfirm(umi, { send: { commitment: 'confirmed' } });
  }
}
