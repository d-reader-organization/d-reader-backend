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
  displayLabel: string;
  guards: DefaultCandyGuardSettings;
  supply: number;
  itemsMinted: number;
  walletSettings: WalletGroupSettings;
};

export type WalletGroupSettings = {
  itemsMinted: number;
  isEligible: boolean;
};

export type GuardParams = {
  startDate: Date;
  endDate: Date;
  publicMintLimit?: number;
  freezePeriod?: number;
};
