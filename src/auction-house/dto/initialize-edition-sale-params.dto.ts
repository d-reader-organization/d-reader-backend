import { IsDate, IsNumber, IsString, Min } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import {
  TransformDateStringToDate,
  TransformStringToNumber,
} from 'src/utils/transform';

export class InitializePrintEditionSaleParams {
  @IsSolanaAddress()
  assetAddress: string;

  @TransformDateStringToDate()
  @IsDate()
  startDate: Date;

  @TransformDateStringToDate()
  @IsDate()
  endDate: Date;

  @TransformStringToNumber()
  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  splTokenAddress: string;
}
