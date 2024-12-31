import {
  CandyMachine,
  DefaultCandyGuardSettings,
  PublicKey,
} from '@metaplex-foundation/js';
import {
  CandyMachineCoupon,
  CandyMachineCouponCurrencySetting,
  CouponType,
  TokenStandard,
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
  sellerFeeBasisPoints: number;
  creatorAddress: string;
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

export type CandyMachineCouponWithWhitelist = CandyMachineCoupon & {
  currencySettings: CandyMachineCouponCurrencySetting[];
};

export type CandyMachineMintData = {
  collectionAddress: string;
  mintAuthority: string;
  couponType: CouponType;
  isSponsored: boolean;
  lookupTableAddress: string;
  mintPrice: number;
  splToken: {
    address: string;
    decimals: number;
    symbol: string;
  };
  tokenStandard: TokenStandard;
  numberOfRedemptions: number;
  startsAt: Date;
  expiresAt: Date;
};
