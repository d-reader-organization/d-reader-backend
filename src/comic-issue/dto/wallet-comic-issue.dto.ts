import { IsBoolean, IsDate, IsPositive } from 'class-validator';

export class WalletComicIssueDto {
  @IsPositive()
  rating: number | null;

  @IsBoolean()
  isFavourite: boolean;

  @IsDate()
  viewedAt: Date | null;

  @IsDate()
  readAt: Date | null;
}
