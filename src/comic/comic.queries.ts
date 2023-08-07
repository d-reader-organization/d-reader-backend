import { Prisma } from '@prisma/client';
import { ComicParams } from './dto/comic-params.dto';
import {
  filterComicBy,
  getSortOrder,
  havingGenreSlugsCondition,
  sortComicBy,
} from '../utils/query-tags-helpers';

const getQueryFilters = (
  query: ComicParams,
): {
  nameCondition: Prisma.Sql;
  creatorWhereCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
  filterCondition: Prisma.Sql;
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
  const sortColumn = sortComicBy(query.sortTag);
  const filterCondition = filterComicBy(query.filterTag);
  return {
    nameCondition,
    creatorWhereCondition,
    sortOrder,
    sortColumn,
    filterCondition,
  };
};

export const getComicsQuery = (query: ComicParams) => {
  const {
    nameCondition,
    creatorWhereCondition,
    sortOrder,
    sortColumn,
    filterCondition,
  } = getQueryFilters(query);
  return Prisma.sql`SELECT comic."title", comic.slug, comic."audienceType", comic.cover, comic.banner, comic.pfp, comic.logo, comic.description, comic."flavorText", comic.website, comic.twitter, comic.discord, comic.telegram, comic.instagram, comic."tikTok", comic."youTube", comic."updatedAt", comic."createdAt", comic."deletedAt", comic."featuredAt", comic."verifiedAt", comic."publishedAt", comic."popularizedAt", comic."completedAt",json_agg(distinct genre.*) AS genres, to_jsonb(creator) as creator,
AVG(userComic.rating) as "averageRating",
(select COUNT(*) from (select * from "UserComic" wc where wc."comicSlug" = comic.slug and wc.rating is not null) wcResult) as "ratersCount",
(select COUNT(*) from (select * from "UserComic" wc where wc."comicSlug" = comic.slug and wc."viewedAt" is not null) wcResult) as "viewersCount",
(select COUNT(*) from (select * from "UserComic" wc where wc."comicSlug" = comic.slug and wc."isFavourite" = true) wcResult) as "favouritesCount",
(select COUNT(*) from "UserComicIssue" wci inner join "ComicIssue" ci  on ci.id = wci."comicIssueId" where ci."comicSlug" = comic.slug and wci."readAt" is not null) as "readersCount",
(select COUNT(*) from (select * from "ComicIssue" comicIssue where comicissue."comicSlug" = comic.slug) issuesResult) as "issuesCount"
FROM "Comic" comic
inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comic.slug 
inner join "Genre" genre on genre.slug = "comicToGenre"."B"
inner join "Creator" creator on creator.id = comic."creatorId"
left join "ComicIssue" comicIssue on comicissue."comicSlug" = comic.slug
left join "UserComic" userComic on userComic."comicSlug" = comic.slug
where comic."deletedAt" is null and comic."verifiedAt" is not null and comic."publishedAt" < now()
${filterCondition}
${nameCondition}
${creatorWhereCondition}
group by comic."title", comic.slug, creator.*
${havingGenreSlugsCondition(query.genreSlugs)}
ORDER BY ${sortColumn} ${sortOrder}
OFFSET ${query.skip}
LIMIT ${query.take};`;
};
