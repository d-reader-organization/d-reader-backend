import { Min } from 'class-validator';

export class ComicIssueStatsDto {
  @Min(0)
  floorPrice: number;

  @Min(0)
  totalVolume: number;

  @Min(0)
  totalIssuesCount: number;
}
