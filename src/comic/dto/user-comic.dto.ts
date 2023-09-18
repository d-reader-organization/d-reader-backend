import { IsBoolean, IsOptional, Max, Min } from 'class-validator';

export class UserComicDto {
  @Min(1)
  @Max(5)
  @IsOptional()
  rating: number | null;

  // @IsBoolean()
  // isSubscribed: boolean;

  @IsBoolean()
  isFavourite: boolean;

  @IsBoolean()
  isBookmarked: boolean;
}
