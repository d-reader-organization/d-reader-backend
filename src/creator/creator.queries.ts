import { Prisma } from '@prisma/client';
import { CreatorFilterParams } from './dto/creator-filter-params.dto';
import {
  filterCreatorBy,
  getSortOrder,
  havingGenreSlugsCondition,
  sortCreatorBy,
} from '../utils/query-tags-helpers';

const getQueryFilters = (
  query: CreatorFilterParams,
): {
  nameCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
  filterCondition: Prisma.Sql;
} => {
  const nameCondition = !!query.nameSubstring
    ? Prisma.sql`AND creator."name" ILIKE '%' || ${
        query.nameSubstring ?? ''
      } || '%'`
    : Prisma.empty;

  const sortOrder = getSortOrder(query.sortOrder);
  const sortColumn = sortCreatorBy(query.sortTag);
  const filterCondition = filterCreatorBy(query.filterTag);
  return {
    nameCondition,
    sortOrder,
    sortColumn,
    filterCondition,
  };
};

export const getCreatorsQuery = (query: CreatorFilterParams) => {
  const { nameCondition, sortColumn, sortOrder, filterCondition } =
    getQueryFilters(query);
  return Prisma.sql`select creator.*, json_agg(distinct genre.*) AS genres,
  SUM(case when walletcreator."isFollowing" = true then 1 else 0 end)  as "followersCount"
  from "Creator" creator
  left join "Comic" comic on comic."creatorId" = creator.id
  inner join "_ComicToGenre" "comicToGenre" on "comicToGenre"."A" = comic.slug
  inner join "Genre" genre on genre.slug = "comicToGenre"."B"  
  left join "WalletCreator" walletCreator on walletcreator."creatorSlug" = creator.slug
  where creator."deletedAt" is null and creator."verifiedAt" is not null and creator."emailConfirmedAt" is not null
  ${filterCondition}
  ${nameCondition}
  group by creator.id
  ORDER BY ${sortColumn} ${sortOrder}
  ${havingGenreSlugsCondition(query.genreSlugs)}
  OFFSET ${query.skip}
  LIMIT ${query.take};`;
};
