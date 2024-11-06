import { IsNumber, IsString } from 'class-validator';
import { TransformStringToNumber } from 'src/utils/transform';

export class ExpressInterestDto {
  @IsString()
  transaction: string;

  @TransformStringToNumber()
  @IsNumber()
  expressedAmount: number;
}
