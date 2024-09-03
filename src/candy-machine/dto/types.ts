import {
  CandyMachine,
  DefaultCandyGuardSettings,
  PublicKey,
} from '@metaplex-foundation/js';
import { CandyMachineGroup, WhiteListType } from '@prisma/client';

export type MintSettings = {
  candyMachine: CandyMachine<DefaultCandyGuardSettings>;
  feePayer: PublicKey;
  mint: PublicKey;
  label?: string;
  nftGateMint?: PublicKey;
  allowList?: string[];
};

export type CandyMachineGroupSettings = {
  id: number;
  label: string;
  displayLabel: string;
  supply: number;
  itemsMinted: number;
  splTokenAddress: string;
  startDate: Date;
  endDate: Date;
  mintPrice: number;
  whiteListType: WhiteListType;
  walletStats?: CandyMachineGroupStats;
  userStats?: CandyMachineGroupStats;
  mintLimit?: number;
};

export type CandyMachineGroupStats = {
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
  whiteListType?: WhiteListType;
};

export type DarkblockTraits = {
  name: string;
  value: string;
};

export type GroupWithWhiteListDetails = CandyMachineGroup & {
  users: { userId: number }[];
  wallets: { walletAddress: string }[];
};
