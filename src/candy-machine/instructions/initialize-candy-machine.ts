import {
  CandyMachineConfigLineSettings,
  CreateCandyMachineInput,
  Metaplex,
  Pda,
  getCandyMachineSize,
  toBigNumber,
  toCandyMachineData,
} from '@metaplex-foundation/js';
import {
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createInitializeInstruction as createInitializeCandyGuardInstruction,
  createWrapInstruction,
} from '@metaplex-foundation/mpl-candy-guard';
import { createInitializeV2Instruction as createInitializeCandyMachineInstruction } from '@metaplex-foundation/mpl-candy-machine-core';
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import {
  AUTH_RULES,
  AUTH_RULES_ID,
  BOT_TAX,
  D_PUBLISHER_SYMBOL,
  MIN_COMPUTE_PRICE_IX,
} from '../../constants';
import {
  Umi,
  PublicKey as UmiPublicKey,
  percentAmount,
  some,
  lamports,
  publicKey,
  generateSigner,
} from '@metaplex-foundation/umi';
import {
  create,
  Creator as CoreCmCreator,
  createLutForCandyMachine,
} from 'cma-preview';
import { toUmiGroups } from '../../utils/core-candy-machine';
import { ComicIssueCMInput } from '../../comic-issue/dto/types';
import { GuardParams } from '../dto/types';
import {
  JsonMetadataCreators,
  toLegacyGroups,
} from '../../utils/candy-machine';
import { initializeRecordAuthority } from './initialize-record-authority';
import { sleep, solFromLamports } from '../../utils/helpers';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { createLookupTable } from '../../utils/lookup-table';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Core CandyMachine
export async function createCoreCandyMachine(
  umi: Umi,
  collectionNftAddress: UmiPublicKey,
  comicIssue: ComicIssueCMInput,
  royaltyWallets: JsonMetadataCreators,
  guardParams: GuardParams,
  isPublic?: boolean,
) {
  const candyMachineKey = generateSigner(umi);
  const creators: CoreCmCreator[] = royaltyWallets.map((item) => {
    return {
      address: publicKey(item.address),
      percentageShare: item.share,
      verified: false,
    };
  });

  const createCmBuilder = await create(umi, {
    candyMachine: candyMachineKey,
    collection: collectionNftAddress,
    collectionUpdateAuthority: umi.identity,
    sellerFeeBasisPoints: percentAmount(
      //TODO: Check this if it's giving correct percentage
      Number((comicIssue.sellerFeeBasisPoints / 100).toFixed(2)),
      2,
    ),
    itemsAvailable: guardParams.supply,
    guards: {
      botTax: some({
        lamports: lamports(BOT_TAX),
        lastInstruction: true,
      }),
    },
    groups: toUmiGroups(umi, guardParams, isPublic),
    creators: [
      {
        address: umi.identity.publicKey,
        verified: true,
        percentageShare: 0,
      },
      ...creators,
    ],
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
  const builder = setComputeUnitPrice(umi, { microLamports: 600_000 }).add(
    createCmBuilder,
  );
  await builder.sendAndConfirm(umi, {
    send: { commitment: 'confirmed', skipPreflight: true },
  });
  await sleep(1000);

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

// Legacy CandyMachine
export async function createLegacyCandyMachine(
  metaplex: Metaplex,
  collectionNftAddress: PublicKey,
  comicIssue: ComicIssueCMInput,
  royaltyWallets: JsonMetadataCreators,
  guardParams: GuardParams,
  isPublic?: boolean,
) {
  const candyMachineKey = Keypair.generate();
  const creatorAddress = new PublicKey(comicIssue.creatorAddress);
  const creatorBackupAddress = new PublicKey(comicIssue.creatorBackupAddress);

  const candyMachineAddress = candyMachineKey.publicKey;

  const creators: CreateCandyMachineInput['creators'] = royaltyWallets.map(
    (wallet) => ({
      address: new PublicKey(wallet.address),
      share: wallet.share,
    }),
  );

  await initializeRecordAuthority(
    metaplex,
    candyMachineAddress,
    collectionNftAddress,
    new PublicKey(creatorAddress),
    new PublicKey(creatorBackupAddress),
    guardParams.supply,
  );

  const candyMachineTransaction = await constructCandyMachineTransaction(
    metaplex,
    {
      candyMachine: candyMachineKey,
      authority: metaplex.identity().publicKey,
      collection: {
        address: collectionNftAddress,
        updateAuthority: metaplex.identity(),
      },
      symbol: D_PUBLISHER_SYMBOL,
      maxEditionSupply: toBigNumber(0),
      isMutable: true,
      sellerFeeBasisPoints: comicIssue.sellerFeeBasisPoints,
      itemsAvailable: toBigNumber(guardParams.supply),
      guards: {
        botTax: {
          lamports: solFromLamports(BOT_TAX),
          lastInstruction: true,
        },
      },
      groups: toLegacyGroups(metaplex, guardParams, isPublic),
      creators: [
        {
          address: metaplex.identity().publicKey,
          share: 0,
        },
        ...creators,
      ],
    },
  );

  const candyGuard = metaplex.candyMachines().pdas().candyGuard({
    base: candyMachineAddress,
  });

  const lookupTable = await createLookupTable(metaplex, [
    candyMachineAddress,
    metaplex.identity().publicKey,
    candyGuard,
    collectionNftAddress,
    metaplex.programs().getTokenMetadata().address,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    SYSVAR_SLOT_HASHES_PUBKEY,
  ]);

  await sendAndConfirmTransaction(
    metaplex.connection,
    candyMachineTransaction,
    [metaplex.identity(), candyMachineKey],
  );

  return [candyMachineAddress, lookupTable];
}

export async function constructCandyMachineTransaction(
  metaplex: Metaplex,
  data: CreateCandyMachineInput,
) {
  const instructions: TransactionInstruction[] = [];
  const candyMachineInstructions = await constructCandyMachineInstructions(
    metaplex,
    data,
    metaplex.identity().publicKey,
  );

  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  instructions.push(MIN_COMPUTE_PRICE_IX);
  instructions.push(...candyMachineInstructions);

  const transaction = new Transaction({
    feePayer: metaplex.identity().publicKey,
    ...latestBlockhash,
  }).add(...instructions);
  return transaction;
}

export async function constructCandyMachineInstructions(
  metaplex: Metaplex,
  data: CreateCandyMachineInput,
  payer: PublicKey,
) {
  const { candyMachine, collection, guards, groups } = data;
  const itemSettings: CandyMachineConfigLineSettings = {
    type: 'configLines',
    prefixName: '',
    nameLength: 32,
    prefixUri: '',
    uriLength: 200,
    isSequential: false,
  };
  const authorityPda = metaplex.candyMachines().pdas().authority({
    candyMachine: candyMachine.publicKey,
  });
  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: collection.address,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: collection.address,
  });
  const candyMachineProgram = metaplex.programs().getCandyMachine();
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata();
  const candyMachineData = toCandyMachineData({
    itemsAvailable: data.itemsAvailable,
    symbol: data.symbol,
    sellerFeeBasisPoints: data.sellerFeeBasisPoints,
    maxEditionSupply: data.maxEditionSupply,
    isMutable: data.isMutable,
    creators: data.creators,
    itemSettings,
  });

  const instructions: TransactionInstruction[] = [];
  const candyGuardProgram = metaplex.programs().getCandyGuard();
  const candyGuard = metaplex.candyMachines().pdas().candyGuard({
    base: candyMachine.publicKey,
  });

  const serializedSettings = metaplex
    .candyMachines()
    .guards()
    .serializeSettings(guards, groups);
  const createCandyGuardInstruction = createInitializeCandyGuardInstruction(
    {
      candyGuard,
      base: candyMachine.publicKey,
      authority: data.authority as PublicKey,
      payer: payer,
    },
    { data: serializedSettings },
    candyGuardProgram.address,
  );

  const space = getCandyMachineSize(candyMachineData);
  const createCandyMachineAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: candyMachine.publicKey,
    space,
    lamports: (await metaplex.rpc().getRent(space)).basisPoints.toNumber(),
    programId: candyMachineProgram.address,
  });

  const collectionDelegateRecord = metaplex
    .nfts()
    .pdas()
    .metadataDelegateRecord({
      mint: collection.address,
      type: 'CollectionV1',
      updateAuthority: collection.updateAuthority.publicKey,
      delegate: authorityPda,
    });

  const createCandyMachineInstruction = createInitializeCandyMachineInstruction(
    {
      candyMachine: candyMachine.publicKey,
      authorityPda,
      authority: data.authority as PublicKey,
      payer,
      collectionMetadata,
      collectionMint: collection.address,
      collectionMasterEdition,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
      collectionDelegateRecord,
      tokenMetadataProgram: tokenMetadataProgram.address,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      systemProgram: SystemProgram.programId,
      ruleSet: AUTH_RULES,
      authorizationRules: AUTH_RULES,
      authorizationRulesProgram: AUTH_RULES_ID,
    },
    {
      data: candyMachineData,
      tokenStandard: TokenStandard.ProgrammableNonFungible,
    },
  );

  const wrapCandyGuardInstruction = constructWrapCandyGuardInstruction(
    metaplex,
    candyGuard,
    candyMachine.publicKey,
    data.authority as PublicKey,
  );
  instructions.push(
    createCandyGuardInstruction,
    createCandyMachineAccountInstruction,
    createCandyMachineInstruction,
    wrapCandyGuardInstruction,
  );

  return instructions;
}

function constructWrapCandyGuardInstruction(
  metaplex: Metaplex,
  candyGuard: Pda,
  candyMachine: PublicKey,
  candyMachineAuthority: PublicKey,
) {
  const candyMachineProgram = metaplex.programs().getCandyMachine();
  const candyGuardProgram = metaplex.programs().getCandyGuard();

  return createWrapInstruction(
    {
      candyGuard,
      authority: candyMachineAuthority,
      candyMachine,
      candyMachineProgram: candyMachineProgram.address,
      candyMachineAuthority,
    },
    candyGuardProgram.address,
  );
}
