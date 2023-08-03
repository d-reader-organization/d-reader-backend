import { IsBooleanString, IsNumberString, IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class PrivateBidParams {
  @IsSolanaAddress()
  buyerAddress: string;

  @IsSolanaAddress()
  mintAccount: string;

  @IsNumberString()
  price: number;

  @IsSolanaAddress()
  @IsOptional()
  sellerAddress?: string;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
