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
  createMintV2Instruction,
  MintInstructionArgs,
  MintV2InstructionAccounts,
} from '@metaplex-foundation/mpl-candy-guard';

import { CandyMachine, Metaplex, Pda } from '@metaplex-foundation/js';
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

export async function constructMintInstruction(
  metaplex: Metaplex,
  candyMachine: PublicKey,
  payer: PublicKey,
  mint: Keypair,
  connection: Connection,
  remainingAccounts?: AccountMeta[] | null,
  mintArgs?: Uint8Array | null,
  label?: string | null,
): Promise<TransactionInstruction[]> {
  // candy machine object
  const candyMachineObject: CandyMachine = await metaplex
    .candyMachines()
    .findByAddress({
      address: candyMachine,
    });

  // PDAs
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

  const tokenRecord = Pda.find(METAPLEX_PROGRAM_ID, [
    Buffer.from('metadata', 'utf8'),
    METAPLEX_PROGRAM_ID.toBuffer(),
    mint.publicKey.toBuffer(),
    Buffer.from('token_record', 'utf8'),
    token.toBuffer(),
  ]);

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
  const collectionNft = await metaplex
    .nfts()
    .findByMint({ mintAddress: collectionMint });
  if (!candyMachineObject.candyGuard) {
    console.error('no associated candyguard !');
    return;
  }

  const collectionDelegateRecord = metaplex
    .nfts()
    .pdas()
    .metadataDelegateRecord({
      mint: mint.publicKey,
      type: 'ProgrammableConfigV1',
      updateAuthority: collectionNft.updateAuthorityAddress,
      delegate: authorityPda,
    });

  const accounts: MintV2InstructionAccounts = {
    candyGuard: candyMachineObject.candyGuard?.address,
    candyMachineProgram: CANDY_MACHINE_PROGRAM_ID,
    candyMachine,
    payer: payer,
    minter: payer,
    candyMachineAuthorityPda: authorityPda,
    nftMasterEdition: nftMasterEdition,
    nftMetadata,
    nftMint: mint.publicKey,
    token,
    tokenRecord,
    nftMintAuthority: payer,
    collectionUpdateAuthority: collectionNft.updateAuthorityAddress,
    collectionDelegateRecord,
    collectionMasterEdition,
    collectionMetadata,
    collectionMint,
    tokenMetadataProgram: METAPLEX_PROGRAM_ID,
    splTokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
    sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
  };

  if (!mintArgs) {
    mintArgs = new Uint8Array();
  }

  const args: MintInstructionArgs = {
    mintArgs,
    label: label ?? null,
  };

  const instructions: TransactionInstruction[] = [];
  instructions.push(
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
  instructions.push(
    createMintToInstruction(mint.publicKey, token, payer, 1, []),
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
