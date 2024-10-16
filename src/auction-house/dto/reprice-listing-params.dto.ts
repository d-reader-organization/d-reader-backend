import { IsNumber } from 'class-validator';
import { TransformStringToNumber } from '../../utils/transform';

export class RepriceListingParams {
  @TransformStringToNumber()
  @IsNumber()
  listingId: number;

  @TransformStringToNumber()
  @IsNumber()
  price: number;
}
