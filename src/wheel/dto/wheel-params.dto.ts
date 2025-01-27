import { IsOptional, IsBoolean } from 'class-validator';
import { TransformStringToBoolean } from 'src/utils/transform';

export class WheelParams {
  @IsOptional()
  @TransformStringToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
