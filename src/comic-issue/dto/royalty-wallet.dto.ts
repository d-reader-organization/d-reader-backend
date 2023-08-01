import { IsInt, Max, Min } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class RoyaltyWalletDto {
  @IsSolanaAddress()
  address: string;

  @Min(0)
  @Max(100)
  @IsInt()
  share: number;
}
