import { IsOptional, IsBooleanString, IsNumber } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { TransformStringToNumber } from 'src/utils/transform';

export class ListParams {
  @IsSolanaAddress()
  sellerAddress: string;

  @IsSolanaAddress()
  mintAccount: string;

  @TransformStringToNumber()
  @IsNumber()
  price: number;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
