import { Prisma } from '@prisma/client';
import { SortOrder } from '../types/sort-order';
import { ComicFilterTag, ComicSortTag } from '../comic/dto/comic-params.dto';
import {
  ComicIssueFilterTag,
  ComicIssueSortTag,
} from '../comic-issue/dto/comic-issue-params.dto';
import {
  CreatorFilterTag,
  CreatorSortTag,
} from '../creator/dto/creator-params.dto';
import { RawComicSortTag } from '../comic/dto/raw-comic-params.dto';
import { RawComicIssueSortTag } from 'src/comic-issue/dto/raw-comic-issue-params.dto';

export const filterComicBy = (tag: ComicFilterTag): Prisma.Sql => {
  switch (tag) {
    case ComicFilterTag.Popular:
      return Prisma.sql`AND comic."popularizedAt" is not null`;
    default:
      return Prisma.empty;
  }
};

export const filterComicIssueBy = (tag: ComicIssueFilterTag): Prisma.Sql => {
  switch (tag) {
    case ComicIssueFilterTag.Free:
      return Prisma.sql`AND comicIssue."isFreeToRead" = true`;
    case ComicIssueFilterTag.Popular:
      return Prisma.sql`AND comicIssue."popularizedAt" is not null`;
    default:
      return Prisma.empty;
  }
};

export const filterCreatorBy = (tag: CreatorFilterTag): Prisma.Sql => {
  switch (tag) {
    case CreatorFilterTag.Popular:
      return Prisma.sql`AND creator."popularizedAt" is not null`;
    default:
      return Prisma.empty;
  }
};

export const getSortOrder = (sortOrder?: SortOrder): Prisma.Sql =>
  sortOrder === SortOrder.ASC ? Prisma.sql`asc` : Prisma.sql`desc`;

export const sortComicBy = (tag: ComicSortTag): Prisma.Sql => {
  switch (tag) {
    case ComicSortTag.Title:
      return Prisma.sql`comic."title"`;
    case ComicSortTag.Likes:
      return Prisma.sql`"favouritesCount"`;
    case ComicSortTag.Rating:
      return Prisma.sql`"averageRating"`;
    case ComicSortTag.Readers:
      return Prisma.sql`"readersCount"`;
    case ComicSortTag.Viewers:
      return Prisma.sql`"viewersCount"`;
    case ComicSortTag.Published:
      return Prisma.sql`comic."publishedAt"`;
    default:
      return Prisma.sql`comic."title"`;
  }
};

export const sortRawComicBy = (tag: RawComicSortTag): Prisma.Sql => {
  switch (tag) {
    case RawComicSortTag.Title:
      return Prisma.sql`comic."title"`;
    case RawComicSortTag.Likes:
      return Prisma.sql`"favouritesCount"`;
    case RawComicSortTag.Rating:
      return Prisma.sql`"averageRating"`;
    case RawComicSortTag.Readers:
      return Prisma.sql`"readersCount"`;
    case RawComicSortTag.Viewers:
      return Prisma.sql`"viewersCount"`;
    case RawComicSortTag.Published:
      return Prisma.sql`comic."publishedAt"`;
    default:
      return Prisma.sql`comic."title"`;
  }
};

export const sortComicIssueBy = (tag: ComicIssueSortTag): Prisma.Sql => {
  switch (tag) {
    case ComicIssueSortTag.Title:
      return Prisma.sql`comicIssue."title", comic."title"`;
    case ComicIssueSortTag.Latest:
      return Prisma.sql`comicIssue."releaseDate"`;
    case ComicIssueSortTag.Likes:
      return Prisma.sql`"favouritesCount"`;
    case ComicIssueSortTag.Rating:
      return Prisma.sql`"averageRating"`;
    case ComicIssueSortTag.Readers:
      return Prisma.sql`"readersCount"`;
    case ComicIssueSortTag.Viewers:
      return Prisma.sql`"viewersCount"`;
    default:
      return Prisma.sql`comicIssue."title", comic."title"`;
  }
};

export const sortRawComicIssueBy = (tag: RawComicIssueSortTag): Prisma.Sql => {
  switch (tag) {
    case RawComicIssueSortTag.Title:
      return Prisma.sql`comicIssue."title", comic."title"`;
    case RawComicIssueSortTag.Latest:
      return Prisma.sql`comicIssue."releaseDate"`;
    case RawComicIssueSortTag.Likes:
      return Prisma.sql`"favouritesCount"`;
    case RawComicIssueSortTag.Rating:
      return Prisma.sql`"averageRating"`;
    case RawComicIssueSortTag.Readers:
      return Prisma.sql`"readersCount"`;
    case RawComicIssueSortTag.Viewers:
      return Prisma.sql`"viewersCount"`;
    default:
      return Prisma.sql`comicIssue."title", comic."title"`;
  }
};

export const sortCreatorBy = (tag: CreatorSortTag): Prisma.Sql => {
  switch (tag) {
    case CreatorSortTag.Followers:
      return Prisma.sql`"followersCount"`;
    case CreatorSortTag.Name:
      return Prisma.sql`creator."name"`;
    default:
      return Prisma.sql`creator."name"`;
  }
};

export const havingGenreSlugsCondition = (genreSlugs?: string[]) =>
  !!genreSlugs
    ? Prisma.sql`HAVING array_agg("genre".slug) @> array[${Prisma.join(
        genreSlugs,
      )}]`
    : Prisma.empty;
