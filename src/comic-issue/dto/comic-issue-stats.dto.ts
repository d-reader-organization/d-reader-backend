import { IsOptional, Max, Min } from 'class-validator';

export class ComicIssueStatsDto {
  @Min(0)
  favouritesCount: number;

  // @Min(0)
  // subscribersCount: number;

  @Min(0)
  ratersCount: number;

  @Min(1)
  @Max(5)
  @IsOptional()
  averageRating: number | null;

  @Min(0)
  floorPrice: number;

  @Min(0)
  totalVolume: number;

  @Min(0)
  totalIssuesCount: number;

  @Min(0)
  totalListedCount: number;

  @Min(0)
  readersCount: number;

  @Min(0)
  viewersCount: number;

  @Min(1)
  totalPagesCount: number;
}
