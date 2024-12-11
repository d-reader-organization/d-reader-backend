import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { WheelType } from '@prisma/client';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { TransformDateStringToDate } from '../../utils/transform';

export class CreateWheelBodyDto {
  @IsNotEmpty()
  @MaxLength(48)
  name: string;

  @IsOptional()
  @MaxLength(1024)
  description?: string;

  @IsOptional()
  @IsDate()
  @TransformDateStringToDate()
  startsAt: Date;

  @IsOptional()
  @IsDate()
  @TransformDateStringToDate()
  expiresAt?: Date;

  @IsEnum(WheelType)
  type: WheelType;

  @IsNumber()
  winProbability: number;
}

export class CreateWheelFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;
}

export class CreateWheelDto extends IntersectionType(
  CreateWheelBodyDto,
  CreateWheelFilesDto,
) {}
