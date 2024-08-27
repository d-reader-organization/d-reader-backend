import { IsNumber } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { TransformStringToNumber } from 'src/utils/transform';

export class BidParams {
  @IsSolanaAddress()
  bidderAddress: string;

  @IsSolanaAddress()
  assetAddress: string;

  @TransformStringToNumber()
  @IsNumber()
  price: number;
}
