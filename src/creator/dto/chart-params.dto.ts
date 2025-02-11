import { IsNumber, IsOptional } from 'class-validator';
import { TransformStringToNumber } from 'src/utils/transform';

export class ChartParams {
  @IsOptional()
  @IsNumber()
  @TransformStringToNumber()
  days?: number;
}
