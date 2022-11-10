import { Exclude, Expose } from 'class-transformer';
import { Min } from 'class-validator';

@Exclude()
export class ComicIssueStatsDto {
  @Expose()
  @Min(0)
  floorPrice: number;

  @Expose()
  @Min(0)
  totalSupply: number;

  @Expose()
  @Min(0)
  totalVolume: number;
}
