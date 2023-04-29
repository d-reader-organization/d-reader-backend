import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { WALLET_NAME_SIZE } from '../../constants';

export class RequestPasswordDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  @IsOptional()
  @MaxLength(WALLET_NAME_SIZE)
  name?: string;

  @IsSolanaAddress()
  @IsOptional()
  referrer?: string;
}
