import { IsInt, Max, Min } from 'class-validator';

export class RateComicDto {
  @Min(1)
  @Max(5)
  @IsInt()
  rating: number;
}
