import { IsNumberString, IsOptional, IsBooleanString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class ListParams {
  @IsSolanaAddress()
  mintAccount: string;

  @IsNumberString()
  price: number;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
