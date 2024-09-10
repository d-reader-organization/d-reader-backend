import {
  CandyMachine,
  DefaultCandyGuardSettings,
  PublicKey,
} from '@metaplex-foundation/js';
import {
  CandyMachineCoupon,
  CandyMachineCouponCurrencySetting,
  CandyMachineCouponEligibleUser,
  CandyMachineCouponEligibleWallet,
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
  mintPrice: number;
  usdcEquivalent: number;
  splTokenAddress: string;
};

export type CandyMachineCouponMintStats = {
  itemsMinted?: number;
  isEligible: boolean;
};

export type AddCandyMachineCouponParams = AddCandyMachineCouponConfigParams & {
  name: string;
  description: string;
};

export type AddCandyMachineCouponConfigParams =
  AddCandyMachineCouponPriceConfigParams & {
    startsAt?: Date;
    expiresAt?: Date;
    numberOfRedemptions?: number;
    supply: number;
    couponType: CouponType;
  };

export type AddCandyMachineCouponPriceConfigParams = {
  label: string;
  mintPrice: number;
  usdcEquivalent: number;
  splTokenAddress: string;
};

export type CreateCandyMachineParams = {
  comicName: string;
  assetOnChainName: string;
  startsAt?: Date;
  expiresAt?: Date;
  numberOfRedemptions?: number;
  mintPrice: number;
  usdcEquivalentMintPrice: number;
  supply: number;
  couponType: CouponType;
  splTokenAddress?: string;
};

export type DarkblockTraits = {
  name: string;
  value: string;
};

export type CandyMachineCouponWithEligibleUsersAndWallets =
  CandyMachineCoupon & {
    currencySettings: CandyMachineCouponCurrencySetting[];
  } & { users: CandyMachineCouponEligibleUser[] } & {
    wallets: CandyMachineCouponEligibleWallet[];
  };
