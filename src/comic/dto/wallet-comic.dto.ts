import { IsBoolean, IsPositive } from 'class-validator';

export class WalletComicDto {
  @IsPositive()
  rating: number | null;

  @IsBoolean()
  isSubscribed: boolean;

  @IsBoolean()
  isFavourite: boolean;
}
