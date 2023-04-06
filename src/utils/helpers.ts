import { sol } from '@metaplex-foundation/js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as jdenticon from 'jdenticon';
import { uploadFile } from 'src/aws/s3client';

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

export async function getRandomAvatar(address: string) {
  const buffer = jdenticon.toPng(address, 200);
  const file: any = {
    fieldname: 'avatar.png',
    originalname: 'icon',
    mimetype: 'image/png',
    buffer,
  };
  const prefix = `wallets/${address}/`;
  return await uploadFile(prefix, file);
}
