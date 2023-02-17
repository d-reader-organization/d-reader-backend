import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  AccountMeta,
} from '@solana/web3.js';

import { PROGRAM_ID as CANDY_MACHINE_PROGRAM_ID } from '@metaplex-foundation/mpl-candy-machine-core';

import {
  createMintInstruction,
  MintInstructionAccounts,
  MintInstructionArgs,
} from '@metaplex-foundation/mpl-candy-guard';

import { CandyMachine, Metaplex } from '@metaplex-foundation/js';
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export const METAPLEX_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

export async function mintInstruction(
  metaplex: Metaplex,
  candyMachine: PublicKey,
  payer: PublicKey,
  mint: Keypair,
  connection: Connection,
  remainingAccounts?: AccountMeta[] | null,
  mintArgs?: Uint8Array | null,
  label?: string | null,
): Promise<{ instructions: TransactionInstruction[] } | undefined> {
  // candy machine object
  const candyMachineObject: CandyMachine = await metaplex
    .candyMachines()
    .findByAddress({
      address: candyMachine,
    });

  // PDAs.
  const authorityPda = metaplex.candyMachines().pdas().authority({
    candyMachine: candyMachine,
  });

  const nftMetadata = metaplex.nfts().pdas().metadata({
    mint: mint.publicKey,
  });
  const nftMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: mint.publicKey,
  });

  const nftTokenAccount = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({ mint: mint.publicKey, owner: payer });

  // collection PDAs
  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: candyMachineObject.collectionMintAddress,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: candyMachineObject.collectionMintAddress,
  });

  const collectionAuthorityRecord = metaplex
    .nfts()
    .pdas()
    .collectionAuthorityRecord({
      mint: candyMachineObject.collectionMintAddress,
      collectionAuthority: authorityPda,
    });

  const collectionMint = candyMachineObject.collectionMintAddress;
  // Retrieves the collection nft
  const collection = await metaplex
    .nfts()
    .findByMint({ mintAddress: collectionMint });
  if (!candyMachineObject.candyGuard) {
    console.error('no associated candyguard !');
    return;
  }
  const accounts: MintInstructionAccounts = {
    candyGuard: candyMachineObject.candyGuard?.address,
    candyMachineProgram: CANDY_MACHINE_PROGRAM_ID,
    candyMachine,
    payer: payer,
    candyMachineAuthorityPda: authorityPda,
    nftMasterEdition: nftMasterEdition,
    nftMetadata,
    nftMint: mint.publicKey,
    nftMintAuthority: payer,
    collectionUpdateAuthority: collection.updateAuthorityAddress,
    collectionAuthorityRecord,
    collectionMasterEdition,
    collectionMetadata,
    collectionMint,
    tokenMetadataProgram: METAPLEX_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
    instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
  };

  if (!mintArgs) {
    mintArgs = new Uint8Array();
  }

  const args: MintInstructionArgs = {
    mintArgs,
    label: label ?? null,
  };

  const ixs: TransactionInstruction[] = [];
  ixs.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      ),
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  ixs.push(createInitializeMintInstruction(mint.publicKey, 0, payer, payer));

  ixs.push(
    createAssociatedTokenAccountInstruction(
      payer,
      nftTokenAccount,
      payer,
      mint.publicKey,
    ),
  );

  ixs.push(
    createMintToInstruction(mint.publicKey, nftTokenAccount, payer, 1, []),
  );

  const mintIx = createMintInstruction(accounts, args);

  if (remainingAccounts) {
    mintIx.keys.push(...remainingAccounts);
  }

  ixs.push(mintIx);

  return { instructions: ixs };
}
