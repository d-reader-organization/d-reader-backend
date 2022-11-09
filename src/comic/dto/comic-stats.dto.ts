import { Exclude } from 'class-transformer';
import { Max, Min } from 'class-validator';

@Exclude()
export class ComicStatsDto {
  @Min(0)
  favouritesCount: number;

  @Min(0)
  subscribersCount: number;

  @Min(0)
  ratersCount: number;

  @Min(1)
  @Max(5)
  averageRating: number;

  @Min(0)
  issuesCount: number;

  @Min(0)
  totalVolume: number;

  @Min(0)
  readersCount: number;

  @Min(0)
  viewersCount: number;
}
