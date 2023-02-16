import { Min } from 'class-validator';

export class CreatorStatsDto {
  @Min(0)
  comicIssuesCount: number;

  @Min(0)
  totalVolume: number;

  @Min(0)
  followersCount: number;
}
