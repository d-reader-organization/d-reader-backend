import { UserComic } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { IsNumberRange } from '../../decorators/IsNumberRange';

export class UserComicDto {
  @IsNumberRange(1, 5)
  @IsOptional()
  rating: number | null;

  @IsBoolean()
  isFavourite: boolean;

  @IsBoolean()
  isBookmarked: boolean;

  @IsOptional()
  @IsNumber()
  collectiblesCount?: number;
}

export type UserComicInput = Partial<UserComic> & {
  collectiblesCount?: number;
};

export function toUserComicDto(userComic: UserComicInput) {
  const plainUserComicDto: UserComicDto = {
    rating: userComic.rating,
    isFavourite: !!userComic.favouritedAt,
    isBookmarked: !!userComic.bookmarkedAt,
    collectiblesCount: userComic.collectiblesCount,
  };

  const userComicDto = plainToInstance(UserComicDto, plainUserComicDto);
  return userComicDto;
}

export const toUserComicDtoArray = (userComics: UserComic[]) => {
  return userComics.map(toUserComicDto);
};
