import { PublicKey, SystemProgram } from '@solana/web3.js';
import { BOT_TAX, MIN_COMPUTE_PRICE } from '../../constants';
import {
  Umi,
  PublicKey as UmiPublicKey,
  some,
  lamports,
  publicKey,
  generateSigner,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import {
  create,
  createLutForCandyMachine,
  findCandyGuardPda,
  updateCandyGuard,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { toUmiGroups } from '../../utils/candy-machine';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { NonceAccountArgs } from '../../nonce/types';
import { fromWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';
import { CreateCandyMachineParamsWithLabels } from '../dto/types';
import { base58 } from '@metaplex-foundation/umi/serializers';

// Core CandyMachine
export async function createCoreCandyMachine(
  umi: Umi,
  collectionNftAddress: UmiPublicKey,
  params: CreateCandyMachineParamsWithLabels,
  nonceArgs?: NonceAccountArgs,
) {
  const candyMachineKey = generateSigner(umi);
  const createCmBuilder = await create(umi, {
    candyMachine: candyMachineKey,
    collection: collectionNftAddress,
    collectionUpdateAuthority: umi.identity,
    itemsAvailable: params.supply,
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
    const latestBlockHash = await umi.rpc.getLatestBlockhash({
      commitment: 'confirmed',
    });
    const { signature } = await builder.sendAndConfirm(umi, {
      send: { commitment: 'confirmed', skipPreflight: true },
    });
    await umi.rpc.confirmTransaction(signature, {
      commitment: 'confirmed',
      strategy: { type: 'blockhash', ...latestBlockHash },
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

  try {
    const candyGuard = findCandyGuardPda(umi, {
      base: candyMachineKey.publicKey,
    });
    const guards = {
      botTax: some({
        lamports: lamports(BOT_TAX),
        lastInstruction: false,
      }),
    };

    const updateBuilder = updateCandyGuard(umi, {
      groups: toUmiGroups(umi, params.coupons),
      guards,
      candyGuard,
    });

    const latestBlockHash = await umi.rpc.getLatestBlockhash({
      commitment: 'confirmed',
    });
    const builder = transactionBuilder()
      .add(setComputeUnitPrice(umi, { microLamports: MIN_COMPUTE_PRICE }))
      .add(updateBuilder);

    const response = await builder.sendAndConfirm(umi, {
      send: { commitment: 'confirmed', skipPreflight: true },
    });

    const signature = base58.deserialize(response.signature);
    await umi.rpc.confirmTransaction(response.signature, {
      commitment: 'confirmed',
      strategy: { type: 'blockhash', ...latestBlockHash },
    });

    console.log(
      'guards and groups added in the candymachine successfully',
      signature,
    );
  } catch (e) {
    console.error(
      `Error adding guards and groups onchain in candymachine ${candyMachineKey.publicKey.toString()}`,
      e,
    );
  }

  console.log('CM: ', candyMachineKey.publicKey.toString());

  return [candyMachineKey.publicKey, lookupTable];
}
