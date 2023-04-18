import { IsBooleanString, IsNumberString, IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class PrivateBidParams {
  @IsSolanaAddress()
  mintAccount: string;

  @IsNumberString()
  price: number;

  @IsSolanaAddress()
  @IsOptional()
  seller?: string;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
