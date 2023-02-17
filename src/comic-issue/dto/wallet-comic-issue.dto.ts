import { IsBoolean, IsDate, IsOptional, IsPositive } from 'class-validator';

export class WalletComicIssueDto {
  @IsPositive()
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
