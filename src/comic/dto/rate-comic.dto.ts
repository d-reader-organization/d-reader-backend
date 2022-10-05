import { Exclude, Expose } from 'class-transformer';
import { Max, Min } from 'class-validator';

@Exclude()
export class RateComicDto {
  @Expose()
  @Min(1)
  @Max(5)
  rating: number;
}
