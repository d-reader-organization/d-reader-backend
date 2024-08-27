import { IsNumber } from 'class-validator';
import { TransformStringToNumber } from 'src/utils/transform';

export class ExecuteSaleParams {
  @TransformStringToNumber()
  @IsNumber()
  listingId: number;

  @TransformStringToNumber()
  @IsNumber()
  bidId: number;
}
