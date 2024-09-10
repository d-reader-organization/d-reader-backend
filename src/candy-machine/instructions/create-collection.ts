import { PublicKey, SystemProgram } from '@solana/web3.js';
import { MIN_COMPUTE_PRICE } from '../../constants';
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

export async function createCoreCollection(
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
