import {
  CandyMachine,
  DefaultCandyGuardSettings,
  PublicKey,
} from '@metaplex-foundation/js';

export type MintSettings = {
  candyMachine: CandyMachine<DefaultCandyGuardSettings>;
  feePayer: PublicKey;
  mint: PublicKey;
  label?: string;
  nftGateMint?: PublicKey;
  allowList?: string[];
};

export type CandyMachineGroupSettings = {
  label: string;
  displayLabel: string;
  supply: number;
  itemsMinted: number;
  splTokenAddress: string;
  startDate: Date;
  endDate: Date;
  mintPrice: number;
  walletStats: CandyMachineGroupWalletStats;
  mintLimit?: number;
};

export type CandyMachineGroupWalletStats = {
  itemsMinted: number;
  isEligible: boolean;
};

export type GuardParams = {
  mintPrice: number;
  startDate?: Date;
  endDate?: Date;
  label: string;
  displayLabel: string;
  supply: number;
  splTokenAddress: string;
  mintLimit?: number;
  freezePeriod?: number;
  frozen?: boolean;
};

export type DarkblockTraits = {
  name: string;
  value: string;
};
