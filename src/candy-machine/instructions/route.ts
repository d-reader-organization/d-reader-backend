import { CandyMachine, Metaplex, PublicKey } from '@metaplex-foundation/js';
import {
  GuardType,
  createRouteInstruction,
} from '@metaplex-foundation/mpl-candy-guard';
import {
  AccountMeta,
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { AUTH_RULES, AUTH_RULES_ID } from '../../constants';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export function constructRouteInstruction(
  metaplex: Metaplex,
  candyMachine: CandyMachine,
  feePayer: PublicKey,
  label: string,
  data: Uint8Array,
  guard: GuardType,
  remainingAccounts?: AccountMeta[],
) {
  const routeInstruction = createRouteInstruction(
    {
      candyGuard: candyMachine.candyGuard.address,
      candyMachine: candyMachine.address,
      payer: feePayer,
    },
    {
      args: {
        guard,
        data,
      },
      label: label ?? null,
    },
    metaplex.programs().getCandyGuard().address,
  );
  if (remainingAccounts) routeInstruction.keys.push(...remainingAccounts);
  return routeInstruction;
}

export async function constructThawTransaction(
  metaplex: Metaplex,
  candyMachineAddress: PublicKey,
  nftMint: PublicKey,
  nftOwner: PublicKey,
  guard: string,
  label: string,
) {
  const candyMachine = await metaplex
    .candyMachines()
    .findByAddress({ address: candyMachineAddress });
  const settings = {
    path: 'thaw',
    nftMint,
    nftOwner,
  };
  const parsedRouteSettings = metaplex
    .candyMachines()
    .guards()
    .parseRouteSettings(
      candyMachine.address,
      candyMachine.candyGuard,
      metaplex.identity(),
      guard,
      settings,
      label,
    );
  const group = candyMachine.candyGuard.groups.find(
    (group) => group.label === label,
  );
  let destination: PublicKey;
  if (group.guards.freezeSolPayment) {
    destination = group.guards.freezeSolPayment.destination;
  } else {
    destination = group.guards.freezeTokenPayment.destinationAta;
  }
  const remainingAccounts = getThawNftAccounts(
    metaplex,
    candyMachine.address,
    candyMachine.candyGuard.address,
    nftOwner,
    nftMint,
    destination,
  );
  const routeInstruction = constructRouteInstruction(
    metaplex,
    candyMachine,
    metaplex.identity().publicKey,
    group.label,
    parsedRouteSettings.arguments,
    GuardType.FreezeSolPayment,
    remainingAccounts,
  );
  const transaction = new Transaction();
  return transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 800000 }),
    routeInstruction,
  );
}

export function getThawNftAccounts(
  metaplex: Metaplex,
  candyMachine: PublicKey,
  candyGuard: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
): AccountMeta[] {
  const metadata = metaplex.nfts().pdas().metadata({ mint });
  const freezeEscrow = metaplex
    .candyMachines()
    .pdas()
    .freezeEscrow({ destination, candyMachine, candyGuard });
  const nftFreezeAta = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({ mint: mint, owner: freezeEscrow });
  const token = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({ mint: mint, owner });
  const nftAtaTokenRecord = metaplex.nfts().pdas().tokenRecord({ mint, token });
  const nftFreezeAtaTokenRecord = metaplex
    .nfts()
    .pdas()
    .tokenRecord({ mint, token: nftFreezeAta });

  return [
    {
      pubkey: freezeEscrow,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: mint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: owner,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: token,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: metaplex.nfts().pdas().masterEdition({ mint }),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: metaplex.programs().getTokenMetadata().address,
      isSigner: false,
      isWritable: false,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metadata,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: nftFreezeAta,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: SystemProgram.programId,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: nftAtaTokenRecord,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: nftFreezeAtaTokenRecord,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: AUTH_RULES_ID,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: AUTH_RULES,
    },
  ];
}
