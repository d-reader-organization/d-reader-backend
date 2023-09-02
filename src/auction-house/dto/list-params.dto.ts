import { IsOptional, IsBooleanString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Transform } from 'class-transformer';

export class ListParams {
  @IsSolanaAddress()
  sellerAddress: string;

  @IsSolanaAddress()
  mintAccount: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  price: number;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
