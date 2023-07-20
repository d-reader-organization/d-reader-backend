import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  AccountMeta,
  Transaction,
} from '@solana/web3.js';

import { PROGRAM_ID as CANDY_MACHINE_PROGRAM_ID } from '@metaplex-foundation/mpl-candy-machine-core';

import {
  createMintInstruction,
  createRouteInstruction,
  GuardType,
  MintInstructionAccounts,
  MintInstructionArgs,
} from '@metaplex-foundation/mpl-candy-guard';

import {
  CandyMachine,
  DefaultCandyGuardSettings,
  getMerkleProof,
  Metaplex,
  NftGateGuardMintSettings,
  SolPaymentGuardSettings,
  TokenPaymentGuardSettings,
} from '@metaplex-foundation/js';
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { MintSettings } from '../dto/types';

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
  allowList?: string[],
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
  const collectionNft = await metaplex
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
    collectionUpdateAuthority: collectionNft.updateAuthorityAddress,
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

  const instructions: TransactionInstruction[] = [];

  const guards = resolveGuards(candyMachineObject, label);
  if (guards.allowList) {
    const merkleProof = getMerkleProof(allowList, payer.toString());
    instructions.push(
      constructAllowListRouteInstruction(
        metaplex,
        candyMachineObject,
        payer,
        label,
        merkleProof,
        guards,
      ),
    );
  }

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
      nftTokenAccount,
      payer,
      mint.publicKey,
    ),
  );
  instructions.push(
    createMintToInstruction(mint.publicKey, nftTokenAccount, payer, 1, []),
  );

  const mintInstruction = createMintInstruction(accounts, args);

  if (remainingAccounts) {
    mintInstruction.keys.push(...remainingAccounts);
  }

  instructions.push(mintInstruction);

  return instructions;
}

export const allGuards: string[] = [
  'tokenPayment',
  'solPayment',
  'nftGate',
  'allowList',
  'freezeSolPayment',
];

export function getRemainingAccounts(
  metaplex: Metaplex,
  mintSettings: MintSettings,
): AccountMeta[] {
  const { candyMachine, feePayer, mint, destinationWallet } = mintSettings;
  const initialAccounts: AccountMeta[] = [];

  const guards = resolveGuards(candyMachine, mintSettings.label);
  const remainingAccounts = allGuards.reduce((_, curr) => {
    if (guards[curr]) {
      switch (curr) {
        case 'tokenPayment': {
          initialAccounts.push(
            ...getTokenPaymentAccounts(
              metaplex,
              guards.tokenPayment,
              feePayer,
              mint,
            ),
          );
          break;
        }
        case 'solPayment': {
          initialAccounts.push(...getSolPaymentAccounts(guards.solPayment));
          break;
        }
        case 'nftGate': {
          initialAccounts.push(
            ...getNftGateAccounts(metaplex, feePayer, {
              mint: mintSettings.nftGateMint,
            }),
          );
          break;
        }
        case 'allowList': {
          initialAccounts.push(
            ...getAllowListAccounts(
              metaplex,
              guards.allowList.merkleRoot,
              feePayer,
              candyMachine.address,
              candyMachine.candyGuard.address,
            ),
          );
          break;
        }
        case 'freezeSolPayment': {
          initialAccounts.push(
            ...getFreezeSolPaymentAccounts(
              metaplex,
              mint,
              feePayer,
              destinationWallet,
              candyMachine.address,
              candyMachine.candyGuard.address,
            ),
          );
          break;
        }
      }
    }
    return initialAccounts;
  }, initialAccounts);

  return remainingAccounts;
}

export async function constructMintOneTransaction(
  metaplex: Metaplex,
  feePayer: PublicKey,
  candyMachineAddress: PublicKey,
  label?: string,
  nftGateMint?: PublicKey,
  allowList?: string[],
) {
  const mint = Keypair.generate();
  const candyMachine = await metaplex
    .candyMachines()
    .findByAddress({ address: candyMachineAddress });

  const remainingAccounts = getRemainingAccounts(metaplex, {
    candyMachine,
    feePayer,
    mint: mint.publicKey,
    destinationWallet: metaplex.identity().publicKey,
    label,
    nftGateMint,
  });
  const mintInstructions = await constructMintInstruction(
    metaplex,
    candyMachine.address,
    feePayer,
    mint,
    metaplex.connection,
    remainingAccounts,
    undefined,
    label,
    allowList,
  );
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const mintTransaction = new Transaction({
    feePayer,
    ...latestBlockhash,
  }).add(...mintInstructions);

  mintTransaction.sign(mint);

  const rawTransaction = mintTransaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return rawTransaction.toString('base64');
}

function getTokenPaymentAccounts(
  metaplex: Metaplex,
  tokenPayment: TokenPaymentGuardSettings,
  feepayer: PublicKey,
  mint: PublicKey,
) {
  const payerTokenAccount = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({ mint: mint, owner: feepayer });
  return [
    {
      pubkey: tokenPayment.destinationAta,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: payerTokenAccount,
      isSigner: false,
      isWritable: true,
    },
  ];
}

function getSolPaymentAccounts(solPayment: SolPaymentGuardSettings) {
  return [
    {
      pubkey: solPayment.destination,
      isSigner: false,
      isWritable: true,
    },
  ];
}

function getNftGateAccounts(
  metaplex: Metaplex,
  feePayer: PublicKey,
  nftGate: NftGateGuardMintSettings,
) {
  const tokenAccount =
    nftGate.tokenAccount ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: nftGate.mint,
      owner: feePayer,
    });

  const tokenMetadata = metaplex.nfts().pdas().metadata({
    mint: nftGate.mint,
  });

  return [
    {
      pubkey: tokenAccount,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: tokenMetadata,
      isSigner: false,
      isWritable: false,
    },
  ];
}

function getFreezeSolPaymentAccounts(
  metaplex: Metaplex,
  mint: PublicKey,
  feePayer: PublicKey,
  destinationWallet: PublicKey,
  candyMachine: PublicKey,
  candyGuard: PublicKey,
) {
  const freezePda = metaplex
    .candyMachines()
    .pdas()
    .freezeEscrow({ destination: destinationWallet, candyMachine, candyGuard });
  const tokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
    mint: mint,
    owner: feePayer,
  });

  return [
    {
      pubkey: freezePda,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: tokenAccount,
      isSigner: false,
      isWritable: false,
    },
  ];
}

function constructAllowListRouteInstruction(
  metaplex: Metaplex,
  candyMachine: CandyMachine,
  feePayer: PublicKey,
  label: string,
  merkleProof: Uint8Array[],
  guards: DefaultCandyGuardSettings,
) {
  const vectorSize = Buffer.alloc(4);
  vectorSize.writeUInt32LE(merkleProof.length, 0);
  const args = Buffer.concat([vectorSize, ...merkleProof]);

  const routeInstruction = createRouteInstruction(
    {
      candyGuard: candyMachine.candyGuard.address,
      candyMachine: candyMachine.address,
      payer: feePayer,
    },
    {
      args: {
        guard: GuardType.AllowList, // allow list guard index
        data: args,
      },
      label: label ?? null,
    },
    metaplex.programs().getCandyGuard().address,
  );
  routeInstruction.keys.push(
    ...getAllowListRouteAccounts(
      metaplex,
      candyMachine.address,
      candyMachine.candyGuard.address,
      feePayer,
      guards.allowList.merkleRoot,
    ),
  );
  return routeInstruction;
}

function getAllowListRouteAccounts(
  metaplex: Metaplex,
  candyMachine: PublicKey,
  candyGuard: PublicKey,
  feePayer: PublicKey,
  merkleRoot: Uint8Array,
): AccountMeta[] {
  return [
    {
      isSigner: false,
      isWritable: true,
      pubkey: metaplex.candyMachines().pdas().merkleProof({
        merkleRoot,
        user: feePayer,
        candyMachine,
        candyGuard,
      }),
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.programs().getSystem().address,
    },
  ];
}

function getAllowListAccounts(
  metaplex: Metaplex,
  merkleRoot: Uint8Array,
  feePayer: PublicKey,
  candyMachine: PublicKey,
  candyGuard: PublicKey,
) {
  return [
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.candyMachines().pdas().merkleProof({
        merkleRoot,
        user: feePayer,
        candyMachine,
        candyGuard,
      }),
    },
  ];
}

function resolveGuards(
  candyMachine: CandyMachine<DefaultCandyGuardSettings>,
  label?: string,
) {
  const defaultGuards = candyMachine.candyGuard.guards;

  if (!label) return defaultGuards;

  const group = candyMachine.candyGuard.groups.find(
    (group) => group.label === label,
  );

  // remove null to overwrite default guards with only specified guards in group
  const activeGroupGuards = Object.fromEntries(
    Object.entries(group.guards).filter(([, v]) => v != null),
  ) as Partial<DefaultCandyGuardSettings>;

  return { ...defaultGuards, ...activeGroupGuards };
}
