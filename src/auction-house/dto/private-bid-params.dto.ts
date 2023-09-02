import { IsBooleanString, IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Transform } from 'class-transformer';

export class PrivateBidParams {
  @IsSolanaAddress()
  buyerAddress: string;

  @IsSolanaAddress()
  mintAccount: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  price: number;

  @IsSolanaAddress()
  @IsOptional()
  sellerAddress?: string;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
