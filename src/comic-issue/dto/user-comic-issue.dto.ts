import { IsBoolean, IsDate, IsOptional, Max, Min } from 'class-validator';

export class UserComicIssueDto {
  @Min(1)
  @Max(5)
  @IsOptional()
  rating: number | null;

  @IsBoolean()
  isFavourite: boolean;

  @IsDate()
  viewedAt: Date | null;

  @IsDate()
  readAt: Date | null;

  @IsBoolean()
  @IsOptional()
  canRead?: boolean;
}
