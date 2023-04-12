import {
  CandyMachineConfigLineSettings,
  DefaultCandyGuardSettings,
  Metaplex,
  Pda,
  getCandyMachineSize,
  toCandyMachineData,
} from '@metaplex-foundation/js';
import {
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { CandyMachineCreateData } from '../dto/types/candyMachineData';
import {
  createInitializeInstruction as createInitializeCandyGuardInstruction,
  createWrapInstruction,
} from '@metaplex-foundation/mpl-candy-guard';
import { candyMachineCreateObject } from '../dto/types/candyMachineCreateObject';
import { createInitializeV2Instruction as createInitializeCandyMachineInstruction } from '@metaplex-foundation/mpl-candy-machine-core';
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

export async function createCandyMachine(
  metaplex: Metaplex,
  candyMachineObject: candyMachineCreateObject,
  data: CandyMachineCreateData,
  guards: Partial<DefaultCandyGuardSettings>,
) {
  const { payer, candyMachine, collection } = candyMachineObject;
  const itemSettings: CandyMachineConfigLineSettings = {
    type: 'configLines',
    prefixName: '',
    nameLength: 32,
    prefixUri: '',
    uriLength: 200,
    isSequential: false,
  };
  const authorityPda = metaplex.candyMachines().pdas().authority({
    candyMachine: candyMachine.address,
  });
  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: collection.mint,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: collection.mint,
  });

  const candyMachineProgram = metaplex.programs().getCandyMachine();
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata();
  const candyMachineData = toCandyMachineData({ ...data, itemSettings });

  const instructions: TransactionInstruction[] = [];
  const candyGuardProgram = metaplex.programs().getCandyGuard();
  const candyGuard = metaplex.candyMachines().pdas().candyGuard({
    base: candyMachine.address,
  });

  const serializedSettings = metaplex
    .candyMachines()
    .guards()
    .serializeSettings(guards, []);

  const createCandyGuardInstruction = createInitializeCandyGuardInstruction(
    {
      candyGuard,
      base: candyMachine.address,
      authority: candyMachine.authority,
      payer: payer,
    },
    { data: serializedSettings },
    candyGuardProgram.address,
  );

  const space = getCandyMachineSize(candyMachineData);
  const createCandyMachineAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: candyMachine.address,
    space,
    lamports: (await metaplex.rpc().getRent(space)).basisPoints.toNumber(),
    programId: candyMachineProgram.address,
  });

  const collectionDelegateRecord = metaplex
    .nfts()
    .pdas()
    .metadataDelegateRecord({
      mint: collection.mint,
      type: 'CollectionV1',
      updateAuthority: collection.updateAuthority,
      delegate: authorityPda,
    });

  const createCandyMachineInstruction = createInitializeCandyMachineInstruction(
    {
      candyMachine: candyMachine.address,
      authorityPda,
      authority: candyMachine.authority,
      payer,
      collectionMetadata,
      collectionMint: collection.mint,
      collectionMasterEdition,
      collectionUpdateAuthority: collection.updateAuthority,
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

  const wrapCandyGuardInstruction = createWrapCandyGuardInstruction(
    metaplex,
    candyGuard,
    candyMachineObject,
  );
  instructions.push(
    createCandyGuardInstruction,
    createCandyMachineAccountInstruction,
    createCandyMachineInstruction,
    wrapCandyGuardInstruction,
  );

  return instructions;
}

function createWrapCandyGuardInstruction(
  metaplex: Metaplex,
  candyGuard: Pda,
  candyMachineObject: candyMachineCreateObject,
) {
  const candyMachineProgram = metaplex.programs().getCandyMachine();
  const candyGuardProgram = metaplex.programs().getCandyGuard();

  return createWrapInstruction(
    {
      candyGuard,
      authority: candyMachineObject.candyMachine.authority,
      candyMachine: candyMachineObject.candyMachine.address,
      candyMachineProgram: candyMachineProgram.address,
      candyMachineAuthority: candyMachineObject.candyMachine.authority,
    },
    candyGuardProgram.address,
  );
}
