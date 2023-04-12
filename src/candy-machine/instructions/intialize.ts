import {
  CandyMachineConfigLineSettings,
  DefaultCandyGuardSettings,
  Metaplex,
  Pda,
  getCandyMachineSize,
  toCandyMachineData,
} from '@metaplex-foundation/js';
import { SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { CandyMachineCreateData } from '../dto/types/candyMachineData';
import {
  createInitializeInstruction as createInitializeCandyGuardInstruction,
  createWrapInstruction,
} from '@metaplex-foundation/mpl-candy-guard';
import { candyMachineCreateObject } from '../dto/types/candyMachineCreateObject';
import { createInitializeInstruction as createInitializeCandyMachineInstruction } from '@metaplex-foundation/mpl-candy-machine-core';

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
  const collectionAuthorityRecord = metaplex
    .nfts()
    .pdas()
    .collectionAuthorityRecord({
      mint: collection.mint,
      collectionAuthority: authorityPda,
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
    programId: SystemProgram.programId,
  });

  const createCandyMachineInstruction = createInitializeCandyMachineInstruction(
    {
      candyMachine: candyMachine.address,
      authorityPda,
      authority: candyGuard,
      payer: payer,
      collectionMetadata,
      collectionMint: collection.mint,
      collectionMasterEdition,
      collectionUpdateAuthority: collection.updateAuthority,
      collectionAuthorityRecord,
      tokenMetadataProgram: tokenMetadataProgram.address,
    },
    { data: candyMachineData },
    candyMachineProgram.address,
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
