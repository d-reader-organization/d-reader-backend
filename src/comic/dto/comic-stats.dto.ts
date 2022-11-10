import { Exclude, Expose } from 'class-transformer';
import { Max, Min } from 'class-validator';

@Exclude()
export class ComicStatsDto {
  @Expose()
  @Min(0)
  favouritesCount: number;

  @Expose()
  @Min(0)
  subscribersCount: number;

  @Expose()
  @Min(0)
  ratersCount: number;

  @Expose()
  @Min(1)
  @Max(5)
  averageRating: number;

  @Expose()
  @Min(0)
  issuesCount: number;

  @Expose()
  @Min(0)
  totalVolume: number;

  @Expose()
  @Min(0)
  readersCount: number;

  @Expose()
  @Min(0)
  viewersCount: number;
}
