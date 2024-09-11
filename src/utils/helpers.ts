import { PublicKey, sol } from '@metaplex-foundation/js';
import {
  Connection,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  TransactionInstruction,
} from '@solana/web3.js';
import { HIGH_VALUE, LOW_VALUE } from '../constants';
import {
  CandyMachineCoupon,
  CandyMachineCouponCurrencySetting,
  CouponType,
} from '@prisma/client';

export const currencyFormat = Object.freeze(
  new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
);

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function toSol(funds: number) {
  return parseFloat((funds / LAMPORTS_PER_SOL).toFixed(3));
}

export function chance(chanceForTrue: number) {
  return getRandomInt(0, 10) > chanceForTrue / 10;
}

export function maybeDateNow(chanceForTrue: number) {
  return chance(chanceForTrue) ? new Date() : undefined;
}

export function getRandomFloatOrInt(min: number, max: number) {
  const randomFloat = Math.floor(Math.random() * (max - min + 1) + min);
  return parseFloat(currencyFormat.format(randomFloat));
}

export function solFromLamports(lamports: number) {
  return sol(parseFloat((lamports / LAMPORTS_PER_SOL).toFixed(9)));
}

export function mockPromise<T>(value: T) {
  return new Promise<T>((resolve) =>
    setTimeout(() => {
      resolve(value);
    }, 50),
  );
}

export const formatCurrency = (value?: number, currency = '') => {
  const suffix = currency ? ` ${currency}` : '';
  if (!value) return '-.--' + suffix;
  return currencyFormat.format(value) + suffix;
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
const compactHeader = (n: number) =>
  n <= LOW_VALUE ? 1 : n <= HIGH_VALUE ? 2 : 3;
const compactArraySize = (n: number, size: number) =>
  compactHeader(n) + n * size;

// need more research for better calculation of computeUnits
export function getComputeUnits(instructions: TransactionInstruction[]) {
  const signers = new Set<string>();
  const accounts = new Set<string>();

  const size = instructions.reduce((acc, ix) => {
    ix.keys.forEach(({ pubkey, isSigner }) => {
      const pk = pubkey.toBase58();
      if (isSigner) signers.add(pk);
      accounts.add(pk);
    });
    accounts.add(ix.programId.toBase58());
    const nIndexes = ix.keys.length;
    const opaqueData = ix.data.length;

    return (
      1 + acc + compactArraySize(nIndexes, 1) + compactArraySize(opaqueData, 1)
    );
  }, 0);

  return 200000 + 100000 * instructions.length + 100 * size;
}

export const shortenString = (string: string, chars = 3): string => {
  if (string.length < chars * 2 + 3) return string;
  return `${string.slice(0, chars)}..${string.slice(-chars)}`;
};

/** returns the string with a Date.now() as suffixs for uniqueness
 * @example 'avatar-1688122756821' */
export const appendTimestamp = (string: string) => string + '-' + Date.now();
export const importDynamic = new Function(
  'modulePath',
  'return import(modulePath)',
);

export async function findOwnerByMint(
  connection: Connection,
  mintAddress: PublicKey,
): Promise<string> {
  const largestAccounts = await connection.getTokenLargestAccounts(mintAddress);
  const largestAccountInfo = await connection.getParsedAccountInfo(
    largestAccounts.value[0].address,
  );
  const data = largestAccountInfo.value.data as ParsedAccountData;
  return data.parsed.info.owner;
}

// Finds if wallet belongs to whitelist
export function findWalletInWalletWhiteList(
  walletAddress: string,
  wallets: { walletAddress: string }[],
) {
  return wallets.some((wallet) => wallet.walletAddress === walletAddress);
}

// Finds if user belongs to whitelist
export function findUserInUserWhiteList(
  userId: number,
  users: { userId: number }[],
) {
  return users.some((user) => user.userId == userId);
}

export function removeTwitter(string?: string) {
  if (string?.startsWith('https://twitter.com/')) {
    return string.substring(20);
  } else if (string?.startsWith('https://www.twitter.com/')) {
    return string.substring(24);
  } else if (string?.startsWith('https://x.com/')) {
    return string.substring(18);
  } else if (string?.startsWith('https://www.x.com/')) {
    return string.substring(22);
  } else return '';
}

export function findCandyMachineCouponDiscount(
  coupon: CandyMachineCoupon & {
    currencySettings: CandyMachineCouponCurrencySetting[];
  },
  defaultCoupon: CandyMachineCoupon & {
    currencySettings: CandyMachineCouponCurrencySetting[];
  },
): number {
  const findCouponCurrencySetting = (
    configs: CandyMachineCouponCurrencySetting[],
    splTokenAddress: string,
  ) => configs.find((config) => config.splTokenAddress === splTokenAddress);

  const defaultCouponConfig = defaultCoupon.currencySettings.find(
    (defaultCouponPriceConfig) =>
      findCouponCurrencySetting(
        coupon.currencySettings,
        defaultCouponPriceConfig.splTokenAddress,
      ),
  );

  if (!defaultCouponConfig) {
    return 0;
  }

  const couponCurrencySetting = findCouponCurrencySetting(
    coupon.currencySettings,
    defaultCouponConfig.splTokenAddress,
  );

  if (!couponCurrencySetting) {
    throw new Error('Matching coupon currency setting not found');
  }

  const defaultCouponMintPrice = Number(defaultCouponConfig.mintPrice);
  const couponMintPrice = Number(couponCurrencySetting.mintPrice);

  const difference = Math.abs(defaultCouponMintPrice - couponMintPrice) * 100;
  const discount = Math.ceil(difference / defaultCouponMintPrice);

  return discount;
}

/**
 * There should not be more than 10 coupons of same type and more than 100 currencies in a coupon to avoid conflicts.
 * ``couponTypeIteration``: current number of coupon of same type in a candymachine.
 * ``currencyCouponIteration``: current number of currency in same coupon
 * */

export function getCouponLabel(
  couponType: CouponType,
  couponTypeIteration: number,
  currencyCouponIteration: number,
) {
  const couponMap = {
    [CouponType.PublicUser]: 'pu',
    [CouponType.WhitelistedUser]: 'wu',
    [CouponType.RegisteredUser]: 'ru',
    [CouponType.WhitelistedWallet]: 'ww',
  };
  return `${couponMap[couponType]}${couponTypeIteration}-${currencyCouponIteration}`;
}
