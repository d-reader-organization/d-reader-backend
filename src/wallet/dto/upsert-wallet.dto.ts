import { IsOptional, MaxLength } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { IsValidUsername } from 'src/decorators/IsValidUsername';

export class UpsertWalletDto {
  @IsSolanaAddress()
  address: string;

  @IsOptional()
  @IsValidUsername()
  @MaxLength(32)
  name?: string;

  @IsSolanaAddress()
  @IsOptional()
  referrer?: string;
}
