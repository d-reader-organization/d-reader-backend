import { IsNumber, IsNumberString, IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class InstantBuyParams {
  @IsString()
  mint: string;

  @IsNumberString()
  price: number;

  @IsSolanaAddress()
  @IsOptional()
  seller?: string;

  @IsString()
  @IsOptional()
  tokenAccount?: string;
}
