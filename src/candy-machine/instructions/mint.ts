import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  AccountMeta,
  TransactionMessage,
  VersionedTransaction,
  RpcResponseAndContext,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
} from '@solana/web3.js';

import { PROGRAM_ID as CANDY_MACHINE_PROGRAM_ID } from '@metaplex-foundation/mpl-candy-machine-core';

import {
  createMintV2Instruction,
  MintV2InstructionAccounts,
  MintV2InstructionArgs,
} from '@metaplex-foundation/mpl-candy-guard';

import {
  CandyMachine,
  DefaultCandyGuardSettings,
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
import {
  ALLOW_LIST_PROOF_COMPUTE_PRICE,
  ALLOW_LIST_PROOF_COMPUTE_UNITS,
  AUTH_RULES,
  AUTH_RULES_ID,
  MINT_COMPUTE_PRICE_WHICH_JOSIP_DEEMED_WORTHY,
  MINT_COMPUTE_UNITS,
} from '../../constants';
import { constructAllowListRouteTransaction } from './route';
import {
  createNoopSigner,
  generateSigner,
  some,
  transactionBuilder,
  Umi,
  PublicKey as UmiPublicKey,
  AddressLookupTableInput,
  publicKey,
  none,
} from '@metaplex-foundation/umi';
import {
  CandyMachine as CoreCandyMachine,
  fetchCandyGuard,
  DefaultGuardSetMintArgs,
  DefaultGuardSet,
  getMerkleRoot,
  route,
  getMerkleProof,
  fetchCandyMachine,
  mintV1 as CoreMintV1,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  fetchAddressLookupTable,
  setComputeUnitLimit,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { getThirdPartyUmiSignature } from '../../utils/metaplex';

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
  instructions.push(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: MINT_COMPUTE_UNITS,
    }),
  );
  instructions.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: MINT_COMPUTE_PRICE_WHICH_JOSIP_DEEMED_WORTHY,
    }),
  );
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
  const { candyMachine, feePayer, mint } = mintSettings;
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
              guards.freezeSolPayment.destination,
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
  lookupTable?: string,
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
    label,
    nftGateMint,
    allowList,
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
  );

  const group = candyMachine.candyGuard.groups.find(
    (group) => group.label === label,
  );
  const rawTransactions: string[] = [];
  if (allowList) {
    const routeTransaction = await constructAllowListRouteTransaction(
      metaplex,
      candyMachine,
      feePayer,
      label,
      group.guards.allowList.merkleRoot,
      allowList,
    );
    if (routeTransaction) rawTransactions.push(routeTransaction);
  }
  let lookupTableAccount: RpcResponseAndContext<AddressLookupTableAccount>;
  if (lookupTable) {
    lookupTableAccount = await metaplex.connection.getAddressLookupTable(
      new PublicKey(lookupTable),
    );
  }
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const mintTransaction = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: mintInstructions,
  }).compileToV0Message(lookupTableAccount ? [lookupTableAccount.value] : []);
  const mintTransactionV0 = new VersionedTransaction(mintTransaction);
  mintTransactionV0.sign([mint]);
  const rawTransaction = Buffer.from(mintTransactionV0.serialize());
  rawTransactions.push(rawTransaction.toString('base64'));

  return rawTransactions;
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

export async function constructCoreMintTransaction(
  umi: Umi,
  candyMachineAddress: UmiPublicKey,
  minter: UmiPublicKey,
  label: string,
  allowList?: string[],
  lookupTableAddress?: string,
  thirdPartySign?: boolean,
) {
  try {
    const transactions: string[] = [];
    const asset = generateSigner(umi);
    const signer = createNoopSigner(minter);

    const candyMachine = await fetchCandyMachine(umi, candyMachineAddress);
    if (allowList) {
      const allowListTransaction = await transactionBuilder()
        .add(
          setComputeUnitLimit(umi, { units: ALLOW_LIST_PROOF_COMPUTE_UNITS }),
        )
        .add(
          setComputeUnitPrice(umi, {
            microLamports: ALLOW_LIST_PROOF_COMPUTE_PRICE,
          }),
        )
        .add(
          route(umi, {
            candyMachine: candyMachine.publicKey,
            guard: 'allowList',
            routeArgs: {
              path: 'proof',
              merkleRoot: getMerkleRoot(allowList),
              merkleProof: getMerkleProof(allowList, minter),
            },
            payer: signer,
            group: label ?? none(),
          }),
        )
        .buildAndSign({ ...umi, payer: signer });
      const encodedTransaction = base64.deserialize(
        umi.transactions.serialize(allowListTransaction),
      )[0];
      transactions.push(encodedTransaction);
    }

    let lookupTable: AddressLookupTableInput;
    if (lookupTableAddress) {
      lookupTable = await fetchAddressLookupTable(
        umi,
        publicKey(lookupTableAddress),
        { commitment: 'confirmed' },
      );
    }
    const mintArgs = await getMintArgs(umi, candyMachine, label);
    let mintTransaction = await transactionBuilder()
      .add(
        setComputeUnitPrice(umi, {
          microLamports: MINT_COMPUTE_PRICE_WHICH_JOSIP_DEEMED_WORTHY,
        }),
      )
      .add(
        CoreMintV1(umi, {
          candyMachine: candyMachine.publicKey,
          minter: signer,
          collection: candyMachine.collectionMint,
          asset,
          group: some(label),
          payer: signer,
          mintArgs,
        }),
      )
      .setAddressLookupTables(lookupTable ? [lookupTable] : [])
      .buildAndSign({ ...umi, payer: signer });

    if (thirdPartySign) {
      mintTransaction = await getThirdPartyUmiSignature(mintTransaction);
    }

    const encodedMintTransaction = base64.deserialize(
      umi.transactions.serialize(mintTransaction),
    )[0];
    transactions.push(encodedMintTransaction);

    return transactions;
  } catch (e) {
    console.error(`Error constructing mint transaction ${e}`);
  }
}

async function getMintArgs(
  umi: Umi,
  candyMachine: CoreCandyMachine,
  label: string,
) {
  const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
  const defaultGuards = candyGuard.guards;
  const group = candyGuard.groups.find((group) => group.label == label);

  if (!group) {
    throw new Error(
      `Group with label ${label} does not exist on Candy Machine ${candyMachine.publicKey.toString()}`,
    );
  }

  // remove null to overwrite default guards with only specified guards in group
  const activeGroupGuards = Object.fromEntries(
    Object.entries(group.guards).filter(([, v]) => v.__option == 'Some'),
  ) as Partial<DefaultGuardSet>;

  const resolvedGuards = { ...defaultGuards, ...activeGroupGuards };
  const availableGuards = Object.entries(resolvedGuards).map(
    (guard) => guard[0],
  );

  const mintArgsEntries = availableGuards
    .map((guard) => {
      if (resolvedGuards[guard].__option == 'Some') {
        switch (guard) {
          case 'thirdPartySigner':
            if (resolvedGuards.thirdPartySigner.__option == 'Some') {
              const signer = createNoopSigner(
                resolvedGuards.thirdPartySigner.value.signerKey,
              );
              return [guard, some({ signer })];
            }
            break;
          case 'allowList':
            if (resolvedGuards.allowList.__option == 'Some') {
              return [
                guard,
                some({ merkleRoot: resolvedGuards.allowList.value.merkleRoot }),
              ];
            }
            break;
          case 'freezeSolPayment':
            if (resolvedGuards.freezeSolPayment.__option == 'Some') {
              return [
                guard,
                some({
                  lamports: resolvedGuards.freezeSolPayment.value.lamports,
                  destination:
                    resolvedGuards.freezeSolPayment.value.destination,
                }),
              ];
            }
            break;

          case 'mintLimit':
            if (resolvedGuards.mintLimit.__option == 'Some') {
              return [guard, some({ id: resolvedGuards.mintLimit.value.id })];
            }
            break;

          case 'redeemedAmount':
            if (resolvedGuards.redeemedAmount.__option == 'Some') {
              return [
                guard,
                some({
                  maximum: Number(resolvedGuards.redeemedAmount.value.maximum),
                }),
              ];
            }
            break;
          case 'solPayment':
            if (resolvedGuards.solPayment.__option == 'Some') {
              return [
                guard,
                some({
                  lamports: resolvedGuards.solPayment.value.lamports,
                  destination: resolvedGuards.solPayment.value.destination,
                }),
              ];
            }
            break;
        }
      }
    })
    .filter(Boolean);

  const mintArgs: Partial<DefaultGuardSetMintArgs> =
    Object.fromEntries(mintArgsEntries);

  return mintArgs;
}
