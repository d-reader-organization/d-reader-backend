import { UserComicIssue } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, Max, Min } from 'class-validator';

export class UserComicIssueDto {
  @Min(1)
  @Max(5)
  @IsOptional()
  rating: number | null;

  @IsBoolean()
  isFavourite: boolean;

  // @IsBoolean()
  // isSubscribed: boolean;

  @IsDate()
  @IsOptional()
  viewedAt: Date | null;

  @IsDate()
  @IsOptional()
  readAt: Date | null;

  @IsBoolean()
  @IsOptional()
  canRead?: boolean;
}

export function toUserComicIssueDto(
  userComic: UserComicIssue & { canRead?: boolean },
) {
  const plainUserComicIssueDto: UserComicIssueDto = {
    rating: userComic.rating,
    isFavourite: !!userComic.favouritedAt,
    // isSubscribed: !!userComic.subscribedAt,
    canRead: userComic?.canRead,
    readAt: userComic.readAt,
    viewedAt: userComic.viewedAt,
  };

  const userComicIssueDto = plainToInstance(
    UserComicIssueDto,
    plainUserComicIssueDto,
  );
  return userComicIssueDto;
}

export const toUserComicIssueDtoArray = (userComics: UserComicIssue[]) => {
  return userComics.map(toUserComicIssueDto);
};
