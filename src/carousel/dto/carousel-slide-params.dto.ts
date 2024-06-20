import { IsBoolean, IsOptional } from 'class-validator';
import { TransformStringToBoolean } from 'src/utils/transform';

export class CarouselSlideFilterParams {
  @IsOptional()
  @TransformStringToBoolean()
  @IsBoolean()
  getExpired?: boolean;
}
