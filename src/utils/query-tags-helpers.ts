import { Prisma } from '@prisma/client';
import { FilterTag, SortTag } from '../types/query-tags';
import { SortOrder } from '../types/sort-order';

export const filterBy = (tag: FilterTag): Prisma.Sql => {
  if (tag === FilterTag.Free) {
    return Prisma.sql`AND comicIssue."supply" = 0`;
  } else if (tag === FilterTag.Popular) {
    return Prisma.sql`AND "popularizedAt" is not null`;
  }
  return Prisma.empty;
};

export const getSortOrder = (sortOrder?: SortOrder): Prisma.Sql =>
  sortOrder === SortOrder.ASC ? Prisma.sql`asc` : Prisma.sql`desc`;

export const sortBy = (tag: SortTag): Prisma.Sql => {
  if (tag === SortTag.Latest) {
    return Prisma.sql`comicIssue."releaseDate"`;
  } else if (tag === SortTag.Likes) {
    return Prisma.sql`"favouritesCount"`;
  } else if (tag === SortTag.Rating) {
    return Prisma.sql`"averageRating"`;
  } else if (tag === SortTag.Readers) {
    return Prisma.sql`"readersCount"`;
  } else if (tag === SortTag.Viewers) {
    return Prisma.sql`"viewersCount"`;
  } else if (tag === SortTag.Published) {
    return Prisma.sql`comic."publishedAt"`;
  } else if (tag === SortTag.Followers) {
    return Prisma.sql`"followersCount"`;
  }
  return Prisma.sql`"publishedAt"`;
};
