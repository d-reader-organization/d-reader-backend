import { IsBooleanString, IsNumber, IsOptional } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { TransformStringToNumber } from 'src/utils/transform';

export class PrivateBidParams {
  @IsSolanaAddress()
  buyerAddress: string;

  @IsSolanaAddress()
  mintAccount: string;

  @TransformStringToNumber()
  @IsNumber()
  price: number;

  @IsSolanaAddress()
  @IsOptional()
  sellerAddress?: string;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
