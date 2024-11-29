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
  titleCondition: Prisma.Sql;
  creatorCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
  filterCondition: Prisma.Sql;
} => {
  const titleSubstring = query.search || query.titleSubstring;
  const titleCondition = !!titleSubstring
    ? Prisma.sql`AND comic."title" ILIKE '%' || ${titleSubstring ?? ''} || '%'`
    : Prisma.empty;
  const creatorCondition = !!query.creatorSlug
    ? Prisma.sql`AND creator."slug" = ${query.creatorSlug}`
    : Prisma.empty;
  const sortOrder = getSortOrder(query.sortOrder);
  const sortColumn = sortComicBy(query.sortTag);
  const filterCondition = filterComicBy(query.filterTag);
  return {
    titleCondition,
    creatorCondition,
    sortOrder,
    sortColumn,
    filterCondition,
  };
};

export const getComicsQuery = (query: ComicParams) => {
  const {
    titleCondition,
    creatorCondition,
    sortOrder,
    sortColumn,
    filterCondition,
  } = getQueryFilters(query);
  return Prisma.sql`SELECT comic."title", comic.slug, comic."audienceType", comic.cover, comic.banner, comic.logo, comic.description, comic."flavorText", comic.website, comic.twitter, comic.discord, comic.telegram, comic.instagram, comic."tikTok", comic."youTube", comic."updatedAt", comic."createdAt", comic."featuredAt", comic."verifiedAt", comic."publishedAt", comic."popularizedAt", comic."completedAt",json_agg(distinct genre.*) AS genres, to_jsonb(creator) as creator,
AVG(userComic.rating) as "averageRating",
(select COUNT(*) from (select * from "UserComic" uc where uc."comicSlug" = comic.slug and uc.rating is not null) ucResult) as "ratersCount",
(select COUNT(*) from (select * from "UserComic" uc where uc."comicSlug" = comic.slug and uc."viewedAt" is not null) ucResult) as "viewersCount",
(select COUNT(*) from (select * from "UserComic" uc where uc."comicSlug" = comic.slug and uc."favouritedAt" is not null) ucResult) as "favouritesCount",
(select COUNT(*) from "UserComicIssue" uci inner join "ComicIssue" ci  on ci.id = uci."comicIssueId" where ci."comicSlug" = comic.slug and uci."readAt" is not null) as "readersCount",
(select COUNT(*) from (select * from "ComicIssue" comicIssue where comicissue."comicSlug" = comic.slug and comicIssue."publishedAt" < NOW() and comicIssue."verifiedAt" IS NOT NULL) issuesResult) as "issuesCount"
FROM "Comic" comic
inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comic.slug 
inner join "Genre" genre on genre.slug = "comicToGenre"."B"
inner join "Creator" creator on creator.id = comic."creatorId"
left join "ComicIssue" comicIssue on comicissue."comicSlug" = comic.slug
left join "UserComic" userComic on userComic."comicSlug" = comic.slug
where comic."verifiedAt" is not null and comic."publishedAt" < now()
${filterCondition}
${titleCondition}
${creatorCondition}
group by comic."title", comic.slug, creator.*
${havingGenreSlugsCondition(query.genreSlugs)}
ORDER BY ${sortColumn} ${sortOrder}
OFFSET ${query.skip}
LIMIT ${query.take};`;
};
