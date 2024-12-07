import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WheelRewardType } from '@prisma/client';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';

export class AddRewardBodyDto {
  @IsNotEmpty()
  @MaxLength(48)
  name: string;

  @IsOptional()
  @MaxLength(1024)
  description?: string;

  @IsEnum(WheelRewardType)
  type: WheelRewardType;

  @IsNumber()
  supply: number;

  @IsNumber()
  weight: number;

  @IsOptional()
  @IsString()
  assetAddress?: string;

  @IsOptional()
  @IsString()
  externalLink?: string;

  @IsNumber()
  winProbability: number;
}

export class AddRewardFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image: Express.Multer.File | null;
}

export class AddRewardDto extends IntersectionType(
  AddRewardBodyDto,
  AddRewardFilesDto,
) {}
