import { Prisma } from '@prisma/client';
import { CreatorFilterParams, CreatorSortTag } from './dto/creator-params.dto';
import {
  filterCreatorBy,
  getSortOrder,
  havingGenreSlugsCondition,
  sortCreatorBy,
} from '../utils/query-tags-helpers';
import { SortOrder } from 'src/types/sort-order';

const getQueryFilters = (
  query: CreatorFilterParams,
): {
  nameCondition: Prisma.Sql;
  sortOrder: Prisma.Sql;
  sortColumn: Prisma.Sql;
  filterCondition: Prisma.Sql;
} => {
  const nameSubstring = query.search || query.nameSubstring;
  const nameCondition = !!nameSubstring
    ? Prisma.sql`AND creator."name" ILIKE '%' || ${nameSubstring ?? ''} || '%'`
    : Prisma.empty;

  const sortOrder = getSortOrder(
    query.sortOrder ?? query.sortTag === CreatorSortTag.Name
      ? SortOrder.ASC
      : SortOrder.DESC,
  );
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
  return Prisma.sql`select creator.*,
  SUM(case when userCreator."followedAt" is not null then 1 else 0 end)  as "followersCount"
  from "Creator" creator
  left join "UserCreator" userCreator on userCreator."creatorSlug" = creator.slug
  where creator."deletedAt" is null and creator."verifiedAt" is not null and creator."emailVerifiedAt" is not null
  ${filterCondition}
  ${nameCondition}
  group by creator.id
  ORDER BY ${sortColumn} ${sortOrder}
  OFFSET ${query.skip}
  LIMIT ${query.take};`;
};

export const getCreatorGenresQuery = (
  creatorId: number,
  genreSlugs?: string[],
) => {
  const filterCondition = Prisma.sql`where comic."creatorId" = ${creatorId}`;
  return Prisma.sql`select jsonb_agg(DISTINCT genre.*) FILTER (WHERE genre.slug IS NOT NULL) AS genres from "Genre" genre 
inner join "_ComicToGenre" ctg on genre.slug  = ctg."B" 
inner join "Comic" comic on comic.slug = ctg."A" 
${filterCondition}
${havingGenreSlugsCondition(genreSlugs)};`;
};
