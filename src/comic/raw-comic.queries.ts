import { Prisma } from '@prisma/client';
import {
  getSortOrder,
  havingGenreSlugsCondition,
  sortRawComicBy,
} from '../utils/query-tags-helpers';
import { RawComicParams } from './dto/raw-comic-params.dto';

const getQueryFilters = (
  query: RawComicParams,
): {
  nameCondition: Prisma.Sql;
  creatorWhereCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
} => {
  const nameCondition = !!query.titleSubstring
    ? Prisma.sql`AND comic."title" ILIKE '%' || ${
        query.titleSubstring ?? ''
      } || '%'`
    : Prisma.empty;
  const creatorWhereCondition = !!query.creatorSlug
    ? Prisma.sql`AND creator."slug" = ${query.creatorSlug}`
    : Prisma.empty;
  const sortOrder = getSortOrder(query.sortOrder);
  const sortColumn = sortRawComicBy(query.sortTag);
  return {
    nameCondition,
    creatorWhereCondition,
    sortOrder,
    sortColumn,
  };
};

export const getRawComicsQuery = (query: RawComicParams) => {
  const { nameCondition, creatorWhereCondition, sortOrder, sortColumn } =
    getQueryFilters(query);
  return Prisma.sql`SELECT comic.*,json_agg(distinct genre.*) AS genres,
AVG(userComic.rating) as "averageRating",
(select COUNT(*) from (select * from "UserComic" uc where uc."comicSlug" = comic.slug and uc.rating is not null) ucResult) as "ratersCount",
(select COUNT(*) from (select * from "UserComic" uc where uc."comicSlug" = comic.slug and uc."viewedAt" is not null) ucResult) as "viewersCount",
(select COUNT(*) from (select * from "UserComic" uc where uc."comicSlug" = comic.slug and uc."favouritedAt" is not null) ucResult) as "favouritesCount",
(select COUNT(*) from "UserComicIssue" uci inner join "ComicIssue" ci  on ci.id = uci."comicIssueId" where ci."comicSlug" = comic.slug and uci."readAt" is not null) as "readersCount",
(select COUNT(*) from (select * from "ComicIssue" comicIssue where comicissue."comicSlug" = comic.slug) issuesResult) as "issuesCount"
FROM "Comic" comic
inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comic.slug 
inner join "Genre" genre on genre.slug = "comicToGenre"."B"
inner join "Creator" creator on creator.id = comic."creatorId"
left join "ComicIssue" comicIssue on comicissue."comicSlug" = comic.slug
left join "UserComic" userComic on userComic."comicSlug" = comic.slug
${nameCondition}
${creatorWhereCondition}
group by comic."title", comic.slug, creator.*
${havingGenreSlugsCondition(query.genreSlugs)}
ORDER BY ${sortColumn} ${sortOrder}
OFFSET ${query.skip}
LIMIT ${query.take};`;
};
