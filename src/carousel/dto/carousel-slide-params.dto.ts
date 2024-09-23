import { ApiProperty } from '@nestjs/swagger';
import { CarouselLocation } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { IsIntRange } from 'src/decorators/IsIntRange';
import {
  TransformStringToBoolean,
  TransformStringToNumber,
} from 'src/utils/transform';

export class GetCarouselSlidesParams {
  @IsOptional()
  @IsIntRange(1, 20)
  @TransformStringToNumber()
  @ApiProperty({ default: 20 })
  take?: number;

  @IsOptional()
  @IsEnum(CarouselLocation)
  @ApiProperty({ enum: CarouselLocation })
  location?: CarouselLocation;

  @IsOptional()
  @TransformStringToBoolean()
  @IsBoolean()
  isExpired?: boolean;
}
