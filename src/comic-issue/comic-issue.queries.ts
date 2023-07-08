import { Prisma } from '@prisma/client';
import { ComicIssueFilterParams } from '../comic-issue/dto/comic-issue-filter-params.dto';
import {
  filterComicIssueBy,
  getSortOrder,
  sortComicIssueBy,
} from '../utils/query-tags-helpers';

const getQueryFilters = (
  query: ComicIssueFilterParams,
): {
  titleCondition: Prisma.Sql;
  comicSlugCondition: Prisma.Sql;
  creatorWhereCondition: Prisma.Sql;
  genreSlugsCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
  filterCondition: Prisma.Sql;
} => {
  const titleCondition = !!query.titleSubstring
    ? Prisma.sql`AND comicIssue."title" ILIKE '%' || ${
        query.titleSubstring ?? ''
      } || '%'`
    : Prisma.empty;
  const comicSlugCondition = !!query.comicSlug
    ? Prisma.sql`AND comicIssue."comicSlug" = ${query.comicSlug}`
    : Prisma.empty;
  const creatorWhereCondition = !!query.creatorSlug
    ? Prisma.sql`AND creator."slug" = ${query.creatorSlug}`
    : Prisma.empty;
  const genreSlugsCondition = !!query.genreSlugs
    ? Prisma.sql`AND "comicToGenre"."B" IN (${Prisma.join(query.genreSlugs)})`
    : Prisma.empty;
  const sortOrder = getSortOrder(query.sortOrder);
  const sortColumn = sortComicIssueBy(query.sortTag);
  const filterCondition = filterComicIssueBy(query.filterTag);
  return {
    titleCondition,
    comicSlugCondition,
    creatorWhereCondition,
    genreSlugsCondition,
    sortOrder,
    sortColumn,
    filterCondition,
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
    filterCondition,
  } = getQueryFilters(query);
  return Prisma.sql`select comicIssue.*, comic."title" as "comicName", comic."audienceType" , creator."name"  as "creatorName", creator.slug  as "creatorSlug", creator."verifiedAt" as "creatorVerifiedAt", creator.avatar as "creatorAvatar", collectionNft."address" as "collectionNftAddress", json_agg(distinct genre.*) AS genres,
  AVG(walletcomicissue.rating) as "averageRating",
  (select COUNT(*)
     from (SELECT wci."isFavourite"
           FROM "WalletComicIssue" wci
           where wci."comicIssueId" = comicIssue.id and wci."isFavourite"  = true
          ) wciResult
    ) as "favouritesCount",
  (select COUNT(*)
     from (SELECT wci."rating"
       FROM "WalletComicIssue" wci
       where wci."comicIssueId" = comicIssue.id and wci."rating"  is not null
          ) wciResult
    ) as "ratersCount",
  (select COUNT(*)
   from (SELECT wci."viewedAt"
     FROM "WalletComicIssue" wci
     where wci."comicIssueId" = comicIssue.id and wci."viewedAt"  is not null
        ) wciResult
  ) as "viewersCount",    
   (select COUNT(*)
     from (SELECT wci."readAt"
       FROM "WalletComicIssue" wci
       where wci."comicIssueId" = comicIssue.id and wci."readAt"  is not null
          ) wciResult
    ) as "readersCount",
    (
      SELECT COUNT(*) as totalIssuesCount
      FROM "ComicIssue" ci2
      where "ci2"."comicSlug"  = comicIssue."comicSlug"
    ) AS "totalIssuesCount",
    (
      SELECT COUNT(*) as totalPagesCount
      FROM "ComicPage" comicPage
      where comicPage."comicIssueId" = comicIssue."id"
    ) AS "totalPagesCount"    
  from "ComicIssue" comicIssue
  inner join "Comic" comic on comic.slug = comicIssue."comicSlug" 
  inner join "Creator" creator on creator.id = comic."creatorId"
  left join "WalletComicIssue" walletComicIssue on walletcomicissue."comicIssueId" = comicIssue.id  
  left join "CollectionNft" collectionNft on collectionnft."comicIssueId" = comicIssue.id 
  inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comicIssue."comicSlug"
  inner join "Genre" genre on "comicToGenre"."B" = genre.slug
WHERE comicIssue."deletedAt" IS NULL AND comicIssue."publishedAt" < NOW() AND comicIssue."verifiedAt" IS NOT NULL AND comic."deletedAt" IS NULL
${filterCondition}
${titleCondition}
${comicSlugCondition}
${creatorWhereCondition}
${genreSlugsCondition}
GROUP BY comicIssue.id, comic."title", comic."audienceType", creator."name", creator.slug , creator."verifiedAt", creator.avatar, collectionnft.address
ORDER BY ${sortColumn} ${sortOrder}
OFFSET ${query.skip}
LIMIT ${query.take}
;`;
};
