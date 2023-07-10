import { Prisma } from '@prisma/client';
import { CreatorFilterParams } from './dto/creator-filter-params.dto';
import { getSortOrder, sortCreatorBy } from '../utils/query-tags-helpers';

const getQueryFilters = (
  query: CreatorFilterParams,
): {
  genreSlugsCondition: Prisma.Sql;
  nameCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
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
  const sortColumn = sortCreatorBy(query.sortTag);
  return {
    genreSlugsCondition,
    nameCondition,
    sortOrder,
    sortColumn,
  };
};

export const getCreatorsQuery = (query: CreatorFilterParams) => {
  const { genreSlugsCondition, nameCondition, sortColumn, sortOrder } =
    getQueryFilters(query);
  return Prisma.sql`select creator.*, json_agg(distinct genre.*) AS genres,
  SUM(case when walletcreator."isFollowing" = true then 1 else 0 end)  as "followersCount"
  from "Creator" creator
  left join "Comic" comic on comic."creatorId" = creator.id
  inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comic.slug
  inner join "Genre" genre on genre.slug = "comicToGenre"."B"  
  left join "WalletCreator" walletCreator on walletcreator."creatorSlug" = creator.slug
  where creator."deletedAt" is null and creator."verifiedAt" is not null and creator."emailConfirmedAt" is not null
  ${nameCondition}
  ${genreSlugsCondition}
  group by creator.id
  ORDER BY ${sortColumn} ${sortOrder}
  OFFSET ${query.skip}
  LIMIT ${query.take};`;
};
