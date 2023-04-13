import {
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
  createMintV2Instruction,
  MintV2InstructionAccounts,
  MintV2InstructionArgs,
} from '@metaplex-foundation/mpl-candy-guard';

import { CandyMachine, Metaplex } from '@metaplex-foundation/js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export const METAPLEX_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

export async function constructMintInstruction(
  metaplex: Metaplex,
  candyMachine: PublicKey,
  payer: PublicKey,
  mint: Keypair,
  remainingAccounts?: AccountMeta[] | null,
  mintArgs?: Uint8Array | null,
  label?: string | null,
): Promise<TransactionInstruction[]> {
  const candyMachineObject: CandyMachine = await metaplex
    .candyMachines()
    .findByAddress({
      address: candyMachine,
    });
  const authorityPda = metaplex.candyMachines().pdas().authority({
    candyMachine: candyMachine,
  });

  const nftMetadata = metaplex.nfts().pdas().metadata({
    mint: mint.publicKey,
  });
  const nftMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: mint.publicKey,
  });

  const token = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({ mint: mint.publicKey, owner: payer });

  const collectionMint = candyMachineObject.collectionMintAddress;
  const tokenRecord = metaplex
    .nfts()
    .pdas()
    .tokenRecord({ mint: mint.publicKey, token });

  const collectionNft = await metaplex
    .nfts()
    .findByMint({ mintAddress: collectionMint });
  if (!candyMachineObject.candyGuard) {
    console.error('No associated candyguard found!');
    return;
  }

  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: collectionMint,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: collectionMint,
  });

  const collectionDelegateRecord = metaplex
    .nfts()
    .pdas()
    .metadataDelegateRecord({
      mint: collectionMint,
      type: 'CollectionV1',
      updateAuthority: collectionNft.updateAuthorityAddress,
      delegate: authorityPda,
    });

  const accounts: MintV2InstructionAccounts = {
    candyGuard: candyMachineObject.candyGuard.address,
    candyMachineProgram: CANDY_MACHINE_PROGRAM_ID,
    candyMachine,
    candyMachineAuthorityPda: authorityPda,
    nftMasterEdition,
    nftMetadata,
    nftMint: mint.publicKey,
    token,
    tokenRecord,
    nftMintAuthority: payer,
    payer,
    minter: payer,
    collectionUpdateAuthority: collectionNft.updateAuthorityAddress,
    collectionDelegateRecord,
    collectionMasterEdition,
    collectionMetadata,
    collectionMint,
    tokenMetadataProgram: METAPLEX_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    splTokenProgram: TOKEN_PROGRAM_ID,
    splAtaProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
  };

  if (!mintArgs) {
    mintArgs = new Uint8Array();
  }

  const args: MintV2InstructionArgs = {
    mintArgs,
    label: label ?? null,
  };

  const instructions: TransactionInstruction[] = [];
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      lamports: await metaplex.connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      ),
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  instructions.push(
    createInitializeMintInstruction(mint.publicKey, 0, payer, payer),
  );
  instructions.push(
    createAssociatedTokenAccountInstruction(
      payer,
      token,
      payer,
      mint.publicKey,
    ),
  );
  const mintInstruction = createMintV2Instruction(accounts, args);

  const mintIndex = mintInstruction.keys.findIndex((key) =>
    key.pubkey.equals(mint.publicKey),
  );
  mintInstruction.keys[mintIndex].isSigner = true;
  mintInstruction.keys[mintIndex].isWritable = true;

  if (remainingAccounts) {
    mintInstruction.keys.push(...remainingAccounts);
  }
  instructions.push(mintInstruction);

  return instructions;
}
