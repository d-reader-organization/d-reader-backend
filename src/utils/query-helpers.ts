import { FilterTag } from 'src/types/filter-tags';

export const filterBy = (tag: FilterTag): Record<string, any> => {
  if (tag === FilterTag.Free) {
    return { supply: 0 };
  } else if (tag === FilterTag.Popular) {
    return { popularizedAt: { not: null } };
  }
  return {};
};

export const sortBy = (tag: FilterTag): string => {
  if (tag === FilterTag.Latest) {
    return '"ci"."releaseDate"';
  } else if (tag === FilterTag.Likes) {
    return 'favouritescount';
  } else if (tag === FilterTag.Rating) {
    return 'averagerating';
  } else if (tag === FilterTag.Readers) {
    return 'readerscount';
  } else if (tag === FilterTag.Viewers) {
    return 'viewerscount';
  }
  return '"ci"."releaseDate"';
};

// const comicIssues = await this.prisma.$queryRawUnsafe<
// (ComicIssue & {
//   comic: Comic & { creator: Creator };
//   collectionNft: { address: string };
//   averagerating: number;
//   raterscount: number;
//   favouritescount: number;
//   readerscount: number;
//   viewerscount: number;
//   totalissuescount: number;
//   totalpagescount: number;
// })[]
// >(
// `SELECT "ci"."id", "ci"."number", "ci"."supply", "ci"."discountMintPrice", "ci"."mintPrice", "ci"."sellerFeeBasisPoints", "ci"."title", "ci"."slug", "ci"."description", "ci"."flavorText", "ci"."cover", "ci"."releaseDate", "ci"."publishedAt", "ci"."popularizedAt", "ci"."verifiedAt", "ci"."deletedAt",
// AVG(case when "wci"."rating" is not null then "wci"."rating" end) AS averageRating,
// SUM(case when "wci"."rating" is not null then 1 end) as ratersCount,
// SUM(case when "wci"."isFavourite" then 1 end) AS favouritesCount,
// SUM(case when "wci"."readAt" is not null then 1 end) AS readersCount,
// SUM(case when "wci"."viewedAt" is not null then 1 end) AS viewersCount,
// (
//   SELECT COUNT(*) as totalIssuesCount
//   FROM "ComicIssue" ci2
//   where "ci2"."comicSlug"  = "ci"."comicSlug"
// ) AS totalIssuesCount,
// (
//   SELECT COUNT(*) as totalPagesCount
//   FROM "ComicPage" cp
//   where "cp"."comicIssueId" = "ci"."id"
// ) AS totalPagesCount
// FROM "ComicIssue" ci
// INNER JOIN "Comic" c ON "c"."slug" = "ci"."comicSlug"
// INNER JOIN "Creator" cr ON "cr"."id" = "c"."creatorId"
// INNER JOIN "WalletComicIssue" wci ON "wci"."comicIssueId" = "ci"."id"
// INNER JOIN "_ComicToGenre" ctg ON "ctg"."A" = "c"."slug"
// LEFT JOIN "CollectionNft" cn ON "cn"."comicIssueId" = "ci"."id"
// WHERE "ci"."title" ILIKE '%' || $1 || '%' AND "ci"."deletedAt" IS NULL AND "ci"."publishedAt" < NOW() AND "ci"."verifiedAt" IS NOT NULL AND "c"."deletedAt" IS NULL
// $2
// $3
// $4
// GROUP BY "ci"."id"
// OFFSET $5
// LIMIT $6
// ;`,
// query.titleSubstring ?? '',
// !!query.comicSlug ? `AND "ci"."comicSlug" = ${query.comicSlug}` : '',
// !!query.creatorSlug ? `AND "cr"."slug" = ${query.creatorSlug}` : '',
// !!query.genreSlugs
//   ? `AND "ctg"."B" IN (${query.genreSlugs.join(',')})`
//   : '',
// query.skip,
// query.take,
// );
