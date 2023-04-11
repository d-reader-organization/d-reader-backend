import {
  DefaultCandyGuardSettings,
  Metaplex,
  Pda,
  getCandyMachineSize,
  toCandyMachineData,
} from '@metaplex-foundation/js';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
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
  collection: PublicKey,
  data: CandyMachineCreateData,
  guards: Partial<DefaultCandyGuardSettings>,
) {
  const itemSettings = {
    type: 'configLines',
    prefixName: '',
    nameLength: 32,
    prefixUri: '',
    uriLength: 200,
    isSequential: false,
  };
  const payer = candyMachineObject.payer ?? metaplex.identity();

  const authorityPda = metaplex.candyMachines().pdas().authority({
    candyMachine: candyMachineObject.candyMachine.key.publicKey,
  });
  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: collection,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: collection,
  });
  const collectionAuthorityRecord = metaplex
    .nfts()
    .pdas()
    .collectionAuthorityRecord({
      mint: collection,
      collectionAuthority: authorityPda,
    });

  const candyMachineProgram = metaplex.programs().getCandyMachine();
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata();

  const candyMachineData = toCandyMachineData(data);

  const instructions: TransactionInstruction[] = [];

  const candyGuardProgram = metaplex.programs().getCandyGuard();
  const candyGuard = metaplex.candyMachines().pdas().candyGuard({
    base: candyMachineObject.candyMachine.key.publicKey,
  });

  const serializedSettings = metaplex
    .candyMachines()
    .guards()
    .serializeSettings(guards, []);

  const createCandyGuardInstruction = createInitializeCandyGuardInstruction(
    {
      candyGuard,
      base: candyMachineObject.candyMachine.key.publicKey,
      authority: candyMachineObject.candyMachine.authority,
      payer: payer.publicKey,
    },
    { data: serializedSettings },
    candyGuardProgram.address,
  );

  const createCandyMachineAccountInstruction = metaplex
    .system()
    .builders()
    .createAccount(
      {
        space: getCandyMachineSize(candyMachineData),
        newAccount: candyMachineObject.candyMachine.key,
        program: candyMachineProgram.address,
      },
      { payer },
    );

  const createCandyMachineInstruction = createInitializeCandyMachineInstruction(
    {
      candyMachine: candyMachineObject.candyMachine.key.publicKey,
      authorityPda,
      authority: candyGuard,
      payer: payer.publicKey,
      collectionMetadata,
      collectionMint: candyMachineObject.collection.mint,
      collectionMasterEdition,
      collectionUpdateAuthority: candyMachineObject.collection.updateAuthority,
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
      candyMachine: candyMachineObject.candyMachine.key.publicKey,
      candyMachineProgram: candyMachineProgram.address,
      candyMachineAuthority: candyMachineObject.candyMachine.authority,
    },
    candyGuardProgram.address,
  );
}
