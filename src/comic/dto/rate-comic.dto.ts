import { Exclude, Expose } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

@Exclude()
export class RateComicDto {
  @Expose()
  @Min(1)
  @Max(5)
  @IsInt()
  rating: number;
}
