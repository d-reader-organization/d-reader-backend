import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ComicStatsDto {
  @Min(0)
  @IsInt()
  favouritesCount: number;

  @Min(0)
  @IsInt()
  ratersCount: number;

  @Min(1)
  @Max(5)
  @IsOptional()
  averageRating: number | null;

  @Min(0)
  @IsInt()
  issuesCount: number;

  @Min(0)
  @IsInt()
  viewersCount: number;
}
