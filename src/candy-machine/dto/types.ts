import {
  CandyMachine,
  DefaultCandyGuardSettings,
  PublicKey,
} from '@metaplex-foundation/js';

export type MintSettings = {
  candyMachine: CandyMachine<DefaultCandyGuardSettings>;
  feePayer: PublicKey;
  mint: PublicKey;
  destinationWallet: PublicKey;
  label?: string;
  nftGateMint?: PublicKey;
};

export type CandyMachineGroupSettings = {
  label: string;
  guards: DefaultCandyGuardSettings;
};

export type GuardParams = {
  startDate: Date;
  endDate: Date;
  publicMintLimit?: number;
  freezePeriod?: number;
};
