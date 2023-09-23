import { OmitType } from '@nestjs/swagger';
import { ComicIssueStatsDto } from './comic-issue-stats.dto';

export class RawComicIssueStatsDto extends OmitType(ComicIssueStatsDto, [
  'price',
  'totalIssuesCount',
] as const) {}
