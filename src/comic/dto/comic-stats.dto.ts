import { IsOptional, Max, Min } from 'class-validator';

export class ComicStatsDto {
  @Min(0)
  favouritesCount: number;

  @Min(0)
  subscribersCount: number;

  @Min(0)
  ratersCount: number;

  @Min(1)
  @Max(5)
  @IsOptional()
  averageRating: number | null;

  @Min(0)
  issuesCount: number;

  @Min(0)
  readersCount: number;

  @Min(0)
  viewersCount: number;
}
