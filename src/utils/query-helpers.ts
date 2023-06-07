import { FilterTag } from 'src/types/filter-tags';

export const filterBy = (tag: FilterTag): Record<string, any> => {
  if (tag === FilterTag.Free) {
    return { supply: 0 };
  } else if (tag === FilterTag.Popular) {
    return { popularizedAt: { not: null } };
  }
  return {};
};
