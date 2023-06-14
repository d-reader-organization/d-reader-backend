import { Prisma } from '@prisma/client';
import { ComicIssueFilterParams } from 'src/comic-issue/dto/comic-issue-filter-params.dto';
import { FilterTag } from 'src/types/filter-tags';
import { SortOrder } from 'src/types/sort-order';

export const filterBy = (tag: FilterTag): Prisma.Sql => {
  if (tag === FilterTag.Free) {
    return Prisma.sql`AND "ci"."supply" = 0`;
  } else if (tag === FilterTag.Popular) {
    return Prisma.sql`AND "ci"."popularizedAt" is not null`;
  }
  return Prisma.empty;
};

const getSortOrder = (sortOrder: SortOrder): Prisma.Sql =>
  sortOrder === SortOrder.ASC ? Prisma.sql`asc` : Prisma.sql`desc`;

const sortBy = (tag: FilterTag): Prisma.Sql => {
  if (tag === FilterTag.Latest) {
    return Prisma.sql`"ci"."releaseDate"`;
  } else if (tag === FilterTag.Likes) {
    return Prisma.sql`favouritescount`;
  } else if (tag === FilterTag.Rating) {
    return Prisma.sql`averagerating`;
  } else if (tag === FilterTag.Readers) {
    return Prisma.sql`readerscount`;
  } else if (tag === FilterTag.Viewers) {
    return Prisma.sql`viewerscount`;
  }
  return Prisma.sql`"ci"."releaseDate"`;
};

export const getQueryFilters = (
  query: ComicIssueFilterParams,
): {
  titleCondition: Prisma.Sql;
  comicSlugCondition: Prisma.Sql;
  creatorWhereCondition: Prisma.Sql;
  genreSlugsCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
} => {
  const titleCondition = !!query.titleSubstring
    ? Prisma.sql`AND "ci"."title" ILIKE '%' || ${query.titleSubstring ?? ''} || '%'`
    : Prisma.empty;
  const comicSlugCondition = !!query.comicSlug
    ? Prisma.sql`AND "ci"."comicSlug" = ${query.comicSlug}`
    : Prisma.empty;
  const creatorWhereCondition = !!query.creatorSlug
    ? Prisma.sql`AND "cr"."slug" = ${query.creatorSlug}`
    : Prisma.empty;
  const genreSlugsCondition = !!query.genreSlugs
    ? Prisma.sql`AND "ctg"."B" IN (${Prisma.join(query.genreSlugs)})`
    : Prisma.empty;
  const sortOrder = getSortOrder(query.sortOrder);
  const sortColumn = sortBy(query.tag);
  return {
    titleCondition,
    comicSlugCondition,
    creatorWhereCondition,
    genreSlugsCondition,
    sortOrder,
    sortColumn,
  };
};
