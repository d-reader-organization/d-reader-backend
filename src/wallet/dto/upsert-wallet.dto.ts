import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UpsertWalletDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  name?: string;

  @IsSolanaAddress()
  @IsOptional()
  referrer?: string;
}
