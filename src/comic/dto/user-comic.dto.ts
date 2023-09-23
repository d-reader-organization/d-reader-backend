import { UserComic } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
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

export function toUserComicDto(userComic: UserComic) {
  const plainUserComicDto: UserComicDto = {
    rating: userComic.rating,
    // isSubscribed: !!userComic.subscribedAt,
    isFavourite: !!userComic.favouritedAt,
    isBookmarked: !!userComic.bookmarkedAt,
  };

  const userComicDto = plainToInstance(UserComicDto, plainUserComicDto);
  return userComicDto;
}

export const toUserComicDtoArray = (userComics: UserComic[]) => {
  return userComics.map(toUserComicDto);
};
