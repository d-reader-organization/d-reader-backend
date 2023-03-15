import { IsBoolean, IsOptional, Max, Min } from 'class-validator';

export class WalletComicDto {
  @Min(1)
  @Max(5)
  @IsOptional()
  rating: number | null;

  @IsBoolean()
  isSubscribed: boolean;

  @IsBoolean()
  isFavourite: boolean;
}
