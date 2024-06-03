import {
  DefaultCandyGuardSettings,
  MetaplexFile,
  UploadMetadataOutput,
} from '@metaplex-foundation/js';
import { ComicRarity as PrismaComicRarity, User, Wallet } from '@prisma/client';
import { ComicRarity } from 'dreader-comic-verse';

export type PickByType<T, V> = {
  [P in keyof T as T[P] extends V | undefined ? P : never]: T[P];
};

export type CoverFiles = {
  usedSigned: MetaplexFile;
  unusedSigned: MetaplexFile;
  usedUnsigned: MetaplexFile;
  unusedUnsigned: MetaplexFile;
};

export type RarityCoverFiles = { [rarity in PrismaComicRarity]: CoverFiles };
export type ItemMetadata = {
  metadata: UploadMetadataOutput;
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

export type Referee = User & { wallets: Wallet[] };
