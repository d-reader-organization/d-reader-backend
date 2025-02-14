import {
  DefaultCandyGuardSettings,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { ComicRarity } from '@prisma/client';

export type PickByType<T, V> = {
  [P in keyof T as T[P] extends V | undefined ? P : never]: T[P];
};

export type CoverFiles = {
  usedSigned: MetaplexFile;
  unusedSigned: MetaplexFile;
  usedUnsigned: MetaplexFile;
  unusedUnsigned: MetaplexFile;
};

export type RarityCoverFiles = { [rarity in ComicRarity]: CoverFiles };
export type ItemMetadata = {
  uri: string;
  isUsed: boolean;
  isSigned: boolean;
  rarity: ComicRarity;
};

export type PickFields<T, K extends keyof T> = K;

export type LegacyGuardGroup = {
  label: string;
  guards: Partial<DefaultCandyGuardSettings>;
};

export type Merge<T, U> = Omit<T, keyof U> & U;

export type With<T extends any[]> = T extends [infer First, ...infer Rest]
  ? Merge<First, With<Rest>>
  : object;

export enum ProgramSource {
  MAGIC_EDEN = 'Magic Eden',
  T_SWAP = 'Tensor Swap',
  T_COMP = 'Tensor Compressed',
  UNKNOWN = 'UNKNOWN',
}

export type INVEST_PROJECT = {
  title: string;
  slug: string;
  isCampaignActive: boolean;
};
