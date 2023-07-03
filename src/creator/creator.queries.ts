import { Prisma } from '@prisma/client';
import { CreatorFilterParams } from './dto/creator-filter-params.dto';
import { getSortOrder } from '../utils/query-tags-helpers';
import { SortTag } from 'src/types/query-tags';

const getQueryFilters = (
  query: CreatorFilterParams,
): {
  genreSlugsCondition: Prisma.Sql;
  nameCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
} => {
  const nameCondition = !!query.nameSubstring
    ? Prisma.sql`AND creator."name" ILIKE '%' || ${
        query.nameSubstring ?? ''
      } || '%'`
    : Prisma.empty;
  const genreSlugsCondition = !!query.genreSlugs
    ? Prisma.sql`AND "comicToGenre"."B" IN (${Prisma.join(query.genreSlugs)})`
    : Prisma.empty;

  const sortOrder = getSortOrder(query.sortOrder);
  return {
    genreSlugsCondition,
    nameCondition,
    sortOrder,
  };
};

export const getCreatorsQuery = (query: CreatorFilterParams) => {
  const { genreSlugsCondition, nameCondition, sortOrder } =
    getQueryFilters(query);
  const orderByColumn =
    query.sortTag !== null && query.sortTag === SortTag.Followers
      ? Prisma.sql`"followersCount"`
      : Prisma.sql`creator.name`;
  return Prisma.sql`select creator.*, json_agg(distinct genre.*) AS genres,
  SUM(case when walletcreator."isFollowing" = true then 1 else 0 end)  as "followersCount",
  (select COUNT(*) from (select * from "ComicIssue" comicIssue where comicissue."comicSlug" = comic.slug) issuesResult) as "comicIssuesCount"
  from "Creator" creator
  left join "Comic" comic on comic."creatorId" = creator.id
  inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comic.slug
  inner join "Genre" genre on genre.slug = "comicToGenre"."B"  
  left join "WalletCreator" walletCreator on walletcreator."creatorSlug" = creator.slug
  where creator."deletedAt" is null and creator."verifiedAt" is not null and creator."emailConfirmedAt" is not null
  ${nameCondition}
  ${genreSlugsCondition}
  group by creator.id, comic.slug
  ORDER BY ${orderByColumn} ${sortOrder}
  OFFSET ${query.skip}
  LIMIT ${query.take};`;
};
