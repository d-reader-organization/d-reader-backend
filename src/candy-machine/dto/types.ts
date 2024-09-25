import {
  CandyMachine,
  DefaultCandyGuardSettings,
  PublicKey,
} from '@metaplex-foundation/js';
import {
  CandyMachineCoupon,
  CandyMachineCouponCurrencySetting,
  CandyMachineCouponWhitelistedUser,
  CandyMachineCouponWhitelistedWallet,
  CouponType,
} from '@prisma/client';

export type MintSettings = {
  candyMachine: CandyMachine<DefaultCandyGuardSettings>;
  feePayer: PublicKey;
  mint: PublicKey;
  label?: string;
  nftGateMint?: PublicKey;
  allowList?: string[];
};

export type CandyMachineCouponWithStats = Omit<
  CandyMachineCoupon,
  'candyMachineAddress'
> & {
  discount: number;
  stats: CandyMachineCouponMintStats;
  prices: CandyMachineCouponPrice[];
};

export type CandyMachineCouponPrice = {
  label: string;
  mintPrice: number;
  usdcEquivalent: number;
  splTokenAddress: string;
};

export type CandyMachineCouponMintStats = {
  itemsMinted?: number;
  isEligible: boolean;
};

export type AddCandyMachineGroupOnChainParams = {
  label: string;
  mintPrice: number;
  splTokenAddress?: string;
  supply: number;
};

export type AddCandyMachineCouponParams = {
  name: string;
  description: string;
  startsAt?: Date;
  expiresAt?: Date;
  numberOfRedemptions?: number;
  supply: number;
  currencySettings: AddCandyMachineCouponCurrencyParams[];
  type: CouponType;
};

export type AddCandyMachineCouponCurrencyParams = {
  mintPrice: number;
  usdcEquivalent: number;
  splTokenAddress?: string;
};

export type CreateCandyMachineParams = {
  comicName: string;
  assetOnChainName: string;
  supply: number;
  coupons: AddCandyMachineCouponParams[];
};

export interface AddCandyMachineCouponCurrencyParamsWithLabel {
  label: string;
  mintPrice: number;
  usdcEquivalent: number;
  splTokenAddress: string;
}
export interface AddCandyMachineCouponParamsWithLabels
  extends Omit<AddCandyMachineCouponParams, 'currencySettings'> {
  currencySettings: AddCandyMachineCouponCurrencyParamsWithLabel[];
}
export interface CreateCandyMachineParamsWithLabels
  extends Omit<CreateCandyMachineParams, 'coupons'> {
  coupons: AddCandyMachineCouponParamsWithLabels[];
}

export type DarkblockTraits = {
  name: string;
  value: string;
};

export type CandyMachineCouponWithWhitelist = CandyMachineCoupon & {
  currencySettings: CandyMachineCouponCurrencySetting[];
} & { users: CandyMachineCouponWhitelistedUser[] } & {
  wallets: CandyMachineCouponWhitelistedWallet[];
};
