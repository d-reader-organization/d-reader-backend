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
  createMintV2Instruction,
  createRouteInstruction,
  GuardType,
  MintV2InstructionAccounts,
  MintV2InstructionArgs,
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { MintSettings } from '../dto/types';
import { AUTH_RULES, AUTH_RULES_ID } from '../../constants';

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

  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: candyMachineObject.collectionMintAddress,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: candyMachineObject.collectionMintAddress,
  });

  const tokenRecord = metaplex
    .nfts()
    .pdas()
    .tokenRecord({ mint: mint.publicKey, token });

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
    authorizationRules: AUTH_RULES,
    authorizationRulesProgram: AUTH_RULES_ID,
    anchorRemainingAccounts: remainingAccounts,
  };
  if (!mintArgs) {
    mintArgs = new Uint8Array();
  }

  const args: MintV2InstructionArgs = {
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
  mintInstruction.keys.push(getRuleSet());

  instructions.push(mintInstruction);
  return instructions;
}

export function getRuleSet(): AccountMeta {
  return {
    isSigner: false,
    isWritable: false,
    pubkey: AUTH_RULES,
  };
}

export function getRemainingAccounts(
  metaplex: Metaplex,
  mintSettings: MintSettings,
): AccountMeta[] {
  const { candyMachine, feePayer, mint, destinationWallet } = mintSettings;
  const initialAccounts: AccountMeta[] = [];
  const candyGuard = metaplex.programs().getCandyGuard();
  const guards = resolveGuards(candyMachine, mintSettings.label);
  const remainingAccounts = candyGuard.availableGuards.reduce((_, curr) => {
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
        case 'mintLimit': {
          initialAccounts.push(
            ...getMintLimitAccounts(
              metaplex,
              guards.mintLimit.id,
              feePayer,
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
  allowList?: string[],
  nftGateMint?: PublicKey,
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

function getMintLimitAccounts(
  metaplex: Metaplex,
  id: number,
  user: PublicKey,
  candyMachine: PublicKey,
  candyGuard: PublicKey,
) {
  const mintCounterPda = metaplex
    .candyMachines()
    .pdas()
    .mintLimitCounter({ id, user, candyGuard, candyMachine });
  return [
    {
      pubkey: mintCounterPda,
      isSigner: false,
      isWritable: true,
    },
  ];
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
  if (!group) {
    throw new Error(
      `Group with label ${label} does not exist on Candy Machine ${candyMachine.address.toString()}`,
    );
  }
  // remove null to overwrite default guards with only specified guards in group
  const activeGroupGuards = Object.fromEntries(
    Object.entries(group.guards).filter(([, v]) => v != null),
  ) as Partial<DefaultCandyGuardSettings>;

  return { ...defaultGuards, ...activeGroupGuards };
}
