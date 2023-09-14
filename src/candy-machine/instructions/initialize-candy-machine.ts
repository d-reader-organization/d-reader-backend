import {
  CandyMachineConfigLineSettings,
  CreateCandyMachineInput,
  Metaplex,
  Pda,
  getCandyMachineSize,
  toCandyMachineData,
} from '@metaplex-foundation/js';
import {
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createInitializeInstruction as createInitializeCandyGuardInstruction,
  createWrapInstruction,
} from '@metaplex-foundation/mpl-candy-guard';
import { createInitializeV2Instruction as createInitializeCandyMachineInstruction } from '@metaplex-foundation/mpl-candy-machine-core';
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

export async function constructCandyMachineTransaction(
  metaplex: Metaplex,
  data: CreateCandyMachineInput,
) {
  const instructions = await constructCandyMachineInstructions(
    metaplex,
    data,
    metaplex.identity().publicKey,
  );
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
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
