import { Comic } from '@prisma/client';

export type ComicStatusProperty = keyof Pick<
  Comic,
  'publishedAt' | 'verifiedAt'
>;

export type ComicIssueStats = {
  favouritesCount: number;
  // subscribersCount: number;
  ratersCount: number;
  previewPagesCount?: number;
  averageRating: number | null;
  price?: number | null;
  totalIssuesCount: number;
  readersCount: number;
  viewersCount: number;
  totalPagesCount: number;
};

export type ComicStats = {
  favouritesCount: number;
  // bookmarksCount: number;
  // subscribersCount: number;
  ratersCount: number;
  averageRating: number | null;
  issuesCount: number;
  readersCount: number;
  viewersCount: number;
};

export type CreatorStats = {
  comicIssuesCount: number;
  totalVolume: number;
  followersCount: number;
  comicsCount?: number;
};

export type RawComicIssueStats = Omit<
  ComicIssueStats,
  'price' | 'totalIssuesCount'
>;
