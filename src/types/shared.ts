import { MetaplexFile } from '@metaplex-foundation/js';
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
