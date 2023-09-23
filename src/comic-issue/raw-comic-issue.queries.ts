import { Prisma } from '@prisma/client';
import {
  getSortOrder,
  havingGenreSlugsCondition,
  sortRawComicIssueBy,
} from '../utils/query-tags-helpers';
import { RawComicIssueParams } from './dto/raw-comic-issue-params.dto';

const getQueryFilters = (
  query: RawComicIssueParams,
): {
  titleCondition: Prisma.Sql;
  comicSlugCondition: Prisma.Sql;
  creatorWhereCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
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
  const sortOrder = getSortOrder(query.sortOrder);
  const sortColumn = sortRawComicIssueBy(query.sortTag);
  return {
    titleCondition,
    comicSlugCondition,
    creatorWhereCondition,
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
    creatorWhereCondition,
    sortColumn,
    sortOrder,
  } = getQueryFilters(query);
  return Prisma.sql`select comicIssue.*, json_agg(distinct genre.*) AS genres, json_agg(distinct statelessCover.*) AS statelessCovers
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
    ) AS "totalPagesCount"    
  from "ComicIssue" comicIssue
  inner join "Comic" comic on comic.slug = comicIssue."comicSlug" 
  inner join "Creator" creator on creator.id = comic."creatorId"
  left join "UserComicIssue" userComicIssue on usercomicissue."comicIssueId" = comicIssue.id  
  left join "CollectionNft" collectionNft on collectionnft."comicIssueId" = comicIssue.id 
  inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comicIssue."comicSlug"
  inner join "Genre" genre on "comicToGenre"."B" = genre.slug
  inner join "StatelessCover" statelessCover on "statelessCover"."comicIssueId" = comicIssue.id
WHERE comicIssue."deletedAt" IS NULL AND comic."deletedAt" IS NULL
${titleCondition}
${comicSlugCondition}
${creatorWhereCondition}
GROUP BY comicIssue.id, comic."title", comic."audienceType", creator."name", creator.slug , creator."verifiedAt", creator.avatar, collectionnft.address
${havingGenreSlugsCondition(query.genreSlugs)}
ORDER BY ${sortColumn} ${sortOrder}
OFFSET ${query.skip}
LIMIT ${query.take}
;`;
};
