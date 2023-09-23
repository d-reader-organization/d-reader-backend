import {
  DefaultCandyGuardSettings,
  MetaplexFile,
  UploadMetadataOutput,
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
export type ItemMedata = {
  [property in keyof CoverFiles]: UploadMetadataOutput;
};

export type PickFields<T, K extends keyof T> = K;

export type GuardGroup = {
  label: string;
  guards: Partial<DefaultCandyGuardSettings>;
};

export type Merge<T, U> = Omit<T, keyof U> & U;

export type With<T extends any[]> = T extends [infer First, ...infer Rest]
  ? Merge<First, With<Rest>>
  : object;
