import { IsNumber, IsOptional } from 'class-validator';
import { TransformStringToNumber } from 'src/utils/transform';

export class ChartParams {
  @IsNumber()
  @TransformStringToNumber()
  creatorId: number;

  @IsOptional()
  @IsNumber()
  @TransformStringToNumber()
  days?: number;
}
