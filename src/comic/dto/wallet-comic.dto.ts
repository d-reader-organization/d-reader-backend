import { Exclude, Expose } from 'class-transformer';
import { IsBoolean, IsPositive } from 'class-validator';

@Exclude()
export class WalletComicDto {
  @Expose()
  @IsPositive()
  rating: number | null;

  @Expose()
  @IsBoolean()
  isSubscribed: boolean;

  @Expose()
  @IsBoolean()
  isFavourite: boolean;
}
