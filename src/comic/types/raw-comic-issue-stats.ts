import { ComicIssueStats } from './comic-issue-stats';

export type RawComicIssueStats = Omit<
  ComicIssueStats,
  'price' | 'totalIssuesCount'
>;
