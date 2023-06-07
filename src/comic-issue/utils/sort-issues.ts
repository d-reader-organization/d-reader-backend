import { FilterTag } from '../../types/filter-tags';
import { ComicIssueInput } from '../dto/comic-issue.dto';

export const sortIssuesByTag = (
  issues: ComicIssueInput[],
  tag: FilterTag,
): ComicIssueInput[] => {
  if (tag === FilterTag.Rating) {
    return issues.sort(
      (a, b) => -(a.stats?.averageRating - b.stats?.averageRating),
    );
  } else if (tag === FilterTag.Likes) {
    return issues.sort(
      (a, b) => -(a.stats?.favouritesCount - b.stats?.favouritesCount),
    );
  } else if (tag === FilterTag.Readers) {
    return issues.sort(
      (a, b) => -(a.stats?.readersCount - b.stats?.readersCount),
    );
  } else if (tag === FilterTag.Viewers) {
    return issues.sort(
      (a, b) => -(a.stats?.viewersCount - b.stats?.viewersCount),
    );
  }
  return issues;
};
