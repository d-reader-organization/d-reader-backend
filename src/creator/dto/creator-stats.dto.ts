import { Exclude, Expose } from 'class-transformer';
import { Min } from 'class-validator';

@Exclude()
export class CreatorStatsDto {
  @Expose()
  @Min(0)
  comicIssuesCount: number;

  @Expose()
  @Min(0)
  totalVolume: number;
}
