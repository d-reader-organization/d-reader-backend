import { IsOptional, MaxLength } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UpsertWalletDto {
  @IsSolanaAddress()
  address: string;

  @IsOptional()
  // @IsAlphanumeric()
  @MaxLength(40)
  name?: string;

  @IsSolanaAddress()
  @IsOptional()
  referrer?: string;
}
