import { Prisma } from '@prisma/client';
import {
  getSortOrder,
  havingGenreSlugsCondition,
  sortRawComicIssueBy,
} from '../utils/query-tags-helpers';
import { RawComicIssueParams } from './dto/raw-comic-issue-params.dto';

const andOrWhere = (...conditions: boolean[]) => {
  return conditions.includes(true) ? Prisma.sql`AND` : Prisma.sql`WHERE`;
};

const getQueryFilters = (
  query: RawComicIssueParams,
): {
  titleCondition: Prisma.Sql;
  comicSlugCondition: Prisma.Sql;
  creatorCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
} => {
  const hasTitleFilter = !!query.search;
  const hasComicSlugFilter = !!query.comicSlug;

  const titleCondition = !!query.search
    ? Prisma.sql`WHERE comicIssue."title" ILIKE '%' || ${
        query.search ?? ''
      } || '%'`
    : Prisma.empty;

  const comicSlugCondition = !!query.comicSlug
    ? Prisma.sql`${andOrWhere(hasTitleFilter)} comicIssue."comicSlug" = ${
        query.comicSlug
      }`
    : Prisma.empty;

  const creatorCondition = !!query.creatorId
    ? Prisma.sql`${andOrWhere(
        hasTitleFilter,
        hasComicSlugFilter,
      )} creator."id" = ${+query.creatorId}`
    : Prisma.empty;

  const sortOrder = getSortOrder(query.sortOrder);
  const sortColumn = sortRawComicIssueBy(query.sortTag);
  return {
    titleCondition,
    comicSlugCondition,
    creatorCondition,
    sortOrder,
    sortColumn,
  };
};

export const getRawComicIssuesQuery = (
  query: RawComicIssueParams,
): Prisma.Sql => {
  const {
    titleCondition,
    comicSlugCondition,
    creatorCondition,
    sortColumn,
    sortOrder,
  } = getQueryFilters(query);
  return Prisma.sql`select comicIssue.*,
  json_agg(distinct genre.*) AS genres,
  json_agg(distinct "statelessCover".*) AS statelessCovers,
  AVG(usercomicissue.rating) as "averageRating",
  (select COUNT(*)
     from (SELECT uci."favouritedAt"
           FROM "UserComicIssue" uci
           where uci."comicIssueId" = comicIssue.id and uci."favouritedAt" is not null
          ) uciResult
    ) as "favouritesCount",
  (select COUNT(*)
     from (SELECT uci."rating"
       FROM "UserComicIssue" uci
       where uci."comicIssueId" = comicIssue.id and uci."rating"  is not null
          ) uciResult
    ) as "ratersCount",
  (select COUNT(*)
   from (SELECT uci."viewedAt"
     FROM "UserComicIssue" uci
     where uci."comicIssueId" = comicIssue.id and uci."viewedAt"  is not null
        ) uciResult
  ) as "viewersCount",    
    (
      SELECT COUNT(*) as previewPagesCount
      FROM "ComicPage" comicPage 
      WHERE comicPage."comicIssueId" = comicIssue.id and "isPreviewable"=true
    ) AS "previewPagesCount",
   (select COUNT(*)
     from (SELECT uci."readAt"
       FROM "UserComicIssue" uci
       where uci."comicIssueId" = comicIssue.id and uci."readAt"  is not null
          ) uciResult
    ) as "readersCount",
    (
      SELECT COUNT(*) as totalPagesCount
      FROM "ComicPage" comicPage
      where comicPage."comicIssueId" = comicIssue."id"
    ) AS "totalPagesCount",
    (
      SELECT collection.address FROM "CollectibleComicCollection" collection 
      WHERE collection."comicIssueId" = comicIssue.id
    ) as collection    
  from "ComicIssue" comicIssue
  inner join "Comic" comic on comic.slug = comicIssue."comicSlug" 
  inner join "Creator" creator on creator.id = comic."creatorId"
  left join "UserComicIssue" userComicIssue on usercomicissue."comicIssueId" = comicIssue.id  
  left join "CollectibleComicCollection" collection on collection."comicIssueId" = comicIssue.id 
  inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comicIssue."comicSlug"
  inner join "Genre" genre on "comicToGenre"."B" = genre.slug
  left join "StatelessCover" "statelessCover" on "statelessCover"."comicIssueId" = comicIssue.id
${titleCondition}
${comicSlugCondition}
${creatorCondition}
GROUP BY comicIssue.id, comic."title", comic."audienceType", creator."name", creator.slug , creator."verifiedAt", creator.avatar, collection.address
${havingGenreSlugsCondition(query.genreSlugs)}
ORDER BY ${sortColumn} ${sortOrder}
OFFSET ${query.skip}
LIMIT ${query.take}
;`;
};
