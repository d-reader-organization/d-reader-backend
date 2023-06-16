import { Prisma } from '@prisma/client';
import { ComicIssueFilterParams } from 'src/comic-issue/dto/comic-issue-filter-params.dto';
import { FilterTag } from 'src/types/filter-tags';
import { SortOrder } from 'src/types/sort-order';

const filterBy = (tag: FilterTag): Prisma.Sql => {
  if (tag === FilterTag.Free) {
    return Prisma.sql`AND "ci"."supply" = 0`;
  } else if (tag === FilterTag.Popular) {
    return Prisma.sql`AND "ci"."popularizedAt" is not null`;
  }
  return Prisma.empty;
};

const getSortOrder = (sortOrder?: SortOrder): Prisma.Sql =>
  sortOrder === SortOrder.ASC ? Prisma.sql`asc` : Prisma.sql`desc`;

const sortBy = (tag: FilterTag): Prisma.Sql => {
  if (tag === FilterTag.Latest) {
    return Prisma.sql`"ci"."releaseDate"`;
  } else if (tag === FilterTag.Likes) {
    return Prisma.sql`"favouritesCount"`;
  } else if (tag === FilterTag.Rating) {
    return Prisma.sql`"averageRating"`;
  } else if (tag === FilterTag.Readers) {
    return Prisma.sql`"readersCount"`;
  } else if (tag === FilterTag.Viewers) {
    return Prisma.sql`"viewersCount"`;
  }
  return Prisma.sql`"ci"."releaseDate"`;
};

const getQueryFilters = (
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
    ? Prisma.sql`AND "ci"."title" ILIKE '%' || ${
        query.titleSubstring ?? ''
      } || '%'`
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

export const getComicIssuesQuery = (
  query: ComicIssueFilterParams,
): Prisma.Sql => {
  const {
    titleCondition,
    comicSlugCondition,
    creatorWhereCondition,
    genreSlugsCondition,
    sortColumn,
    sortOrder,
  } = getQueryFilters(query);
  return Prisma.sql`SELECT "ci".*, "c"."name" as "comicName", "c"."audienceType",  "cr"."name" as "creatorName", "cr"."slug" as "creatorSlug", "cr"."verifiedAt" as "creatorVerifiedAt", "cr"."avatar" as "creatorAvatar",
AVG("wci"."rating") AS "averageRating",
SUM(case when "wci"."rating" is not null then 1 end) as "ratersCount",
SUM(case when "wci"."isFavourite" then 1 end) AS "favouritesCount",
SUM(case when "wci"."readAt" is not null then 1 end) AS "readersCount",
SUM(case when "wci"."viewedAt" is not null then 1 end) AS "viewersCount",
(
  SELECT COUNT(*) as totalIssuesCount
  FROM "ComicIssue" ci2
  where "ci2"."comicSlug"  = "ci"."comicSlug"
) AS "totalIssuesCount",
(
  SELECT COUNT(*) as totalPagesCount
  FROM "ComicPage" cp
  where "cp"."comicIssueId" = "ci"."id"
) AS "totalPagesCount"
FROM "ComicIssue" ci
INNER JOIN "Comic" c ON "c"."slug" = "ci"."comicSlug"
INNER JOIN "Creator" cr ON "cr"."id" = "c"."creatorId"
INNER JOIN "WalletComicIssue" wci ON "wci"."comicIssueId" = "ci"."id"
INNER JOIN "_ComicToGenre" ctg ON "ctg"."A" = "c"."slug"
LEFT JOIN "CollectionNft" cn ON "cn"."comicIssueId" = "ci"."id"
WHERE "ci"."deletedAt" IS NULL AND "ci"."publishedAt" < NOW() AND "ci"."verifiedAt" IS NOT NULL AND "c"."deletedAt" IS NULL
${filterBy(query.tag)}
${titleCondition}
${comicSlugCondition}
${creatorWhereCondition}
${genreSlugsCondition}
GROUP BY "ci"."id", "c"."name", "c"."audienceType", "cr"."name", "cr"."slug", "cr"."verifiedAt","cr"."avatar", "cn"."address"
ORDER BY ${sortColumn} ${sortOrder}
OFFSET ${query.skip}
LIMIT ${query.take}
;`;
};
