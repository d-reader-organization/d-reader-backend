import { IsNumberString, IsOptional } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class PrivateBidParams {
  @IsSolanaAddress()
  mintAccount: string;
  @IsNumberString()
  price: number;
  @IsSolanaAddress()
  @IsOptional()
  seller?: string;
  @IsSolanaAddress()
  @IsOptional()
  tokenAccount?: string;
}
