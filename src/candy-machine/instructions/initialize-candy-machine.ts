import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BOT_TAX, MIN_COMPUTE_PRICE } from '../../constants';
import {
  Umi,
  PublicKey as UmiPublicKey,
  some,
  lamports,
  publicKey,
  generateSigner,
} from '@metaplex-foundation/umi';
import {
  create,
  createLutForCandyMachine,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { toUmiGroups } from '../../utils/candy-machine';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { NonceAccountArgs } from '../../nonce/types';
import { fromWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';
import { CreateCandyMachineParams } from '../dto/types';

// Core CandyMachine
export async function createCoreCandyMachine(
  umi: Umi,
  collectionNftAddress: UmiPublicKey,
  params: CreateCandyMachineParams,
  publicGroupLabel?: string,
  nonceArgs?: NonceAccountArgs,
) {
  const candyMachineKey = generateSigner(umi);
  const createCmBuilder = await create(umi, {
    candyMachine: candyMachineKey,
    collection: collectionNftAddress,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: params.supply,
    guards: {
      botTax: some({
        lamports: lamports(BOT_TAX),
        lastInstruction: true,
      }),
    },
    groups: toUmiGroups(umi, params, publicGroupLabel),
    configLineSettings: some({
      prefixName: '',
      nameLength: 32,
      prefixUri: '',
      uriLength: 200,
      isSequential: false,
    }),
  });

  const recentSlot = await umi.rpc.getSlot({ commitment: 'confirmed' });
  // TODO: check if it requires more compute and why it fails with (Program fails to compelete) without skipPreflight
  let builder = setComputeUnitPrice(umi, {
    microLamports: MIN_COMPUTE_PRICE,
  }).add(createCmBuilder);

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

    await builder.sendAndConfirm(umi, {
      send: { commitment: 'confirmed' },
      confirm: {
        strategy: {
          type: 'durableNonce',
          nonceAccountPubkey: publicKey(nonceArgs.address),
          nonceValue: nonceArgs.nonce,
          minContextSlot: recentSlot,
        },
      },
    });
  } else {
    await builder.sendAndConfirm(umi, {
      send: { commitment: 'confirmed', skipPreflight: true },
    });
  }

  let lookupTable: UmiPublicKey;
  try {
    const [lutBuilder, lut] = await createLutForCandyMachine(
      umi,
      recentSlot,
      candyMachineKey.publicKey,
    );
    await lutBuilder.sendAndConfirm(umi, {
      send: { commitment: 'confirmed', skipPreflight: true },
    });
    lookupTable = lut.publicKey;
  } catch (e) {
    console.error(
      `Error creating lookup table for candymachine ${candyMachineKey.publicKey.toString()}`,
      e,
    );
  }

  console.log('CM: ', candyMachineKey.publicKey.toString());

  return [candyMachineKey.publicKey, lookupTable];
}
