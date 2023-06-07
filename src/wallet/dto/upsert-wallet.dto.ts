import { IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { IsValidUsername } from '../../decorators/IsValidUsername';

export class UpsertWalletDto {
  @IsSolanaAddress()
  address: string;

  @IsOptional()
  @IsValidUsername()
  name?: string;

  @IsSolanaAddress()
  @IsOptional()
  referrer?: string;
}
