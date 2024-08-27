import { IsDate, IsNumber, IsString, Min } from 'class-validator';
import {
  TransformDateStringToDate,
  TransformStringToNumber,
} from 'src/utils/transform';

export class InitializePrintEditionSaleParams {
  @TransformStringToNumber()
  @IsNumber()
  digitalAssetId: number;

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
