import { WalletComic } from '@prisma/client';

export type ComicStats = {
  favouritesCount: number;
  subscribersCount: number;
  ratersCount: number;
  averageRating: number | null;
  issuesCount: number;
  totalVolume: number;
  readersCount: number;
  viewersCount: number;
};

export type WithComicStats<T> = T & {
  stats: ComicStats;
  myStats?: WalletComic;
};
