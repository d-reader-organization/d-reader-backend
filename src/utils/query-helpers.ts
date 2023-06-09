import { FilterTag } from 'src/types/filter-tags';

export const filterBy = (tag: FilterTag): Record<string, any> => {
  if (tag === FilterTag.Free) {
    return { supply: 0 };
  } else if (tag === FilterTag.Popular) {
    return { popularizedAt: { not: null } };
  }
  return {};
};

export const sortBy = (tag: FilterTag): string => {
  if (tag === FilterTag.Latest) {
    return 'ci.releaseDate DESC';
  } else if (tag === FilterTag.Likes) {
    return 'favouritescount DESC';
  } else if (tag === FilterTag.Rating) {
    return 'averagerating DESC';
  } else if (tag === FilterTag.Readers) {
    return 'readerscount DESC';
  } else if (tag === FilterTag.Viewers) {
    return 'viewerscount DESC';
  }
  return 'ci.releaseDate DESC';
};
