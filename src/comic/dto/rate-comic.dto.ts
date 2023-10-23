import { IsInt, Max, Min } from 'class-validator';

export class RateComicDto {
  // TODO v2: Max should be 10
  // add IsStarRating() decorator
  @Min(1)
  @Max(5)
  @IsInt()
  rating: number;
}
