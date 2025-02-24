import { IsNumber, IsOptional, IsString } from 'class-validator';
import { TransformStringToNumber } from 'src/utils/transform';

export class ExpressInterestDto {
  @TransformStringToNumber()
  @IsNumber()
  expressedAmount: number;

  @IsOptional()
  @IsString()
  ref?: string;
}
