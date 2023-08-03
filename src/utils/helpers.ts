import { sol } from '@metaplex-foundation/js';
import { LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import { HIGH_VALUE, LOW_VALUE } from '../constants';

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

export function chance(chanceForTrue: number) {
  return getRandomInt(0, 10) > chanceForTrue / 10;
}

export function getRandomFloatOrInt(min: number, max: number) {
  const randomFloat = Math.floor(Math.random() * (max - min + 1) + min);
  return parseFloat(currencyFormat.format(randomFloat));
}

export function solFromLamports(lamports: number) {
  return sol(lamports / LAMPORTS_PER_SOL);
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
