import { IsNumber, IsOptional } from 'class-validator';
import { TransformStringToNumber } from 'src/utils/transform';

export class GuestInterestParams {
  @TransformStringToNumber()
  @IsNumber()
  campaignId: number;

  @TransformStringToNumber()
  @IsNumber()
  rampUpPeriod: number;

  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  number?: number;
}
