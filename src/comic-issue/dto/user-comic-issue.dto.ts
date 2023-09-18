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
