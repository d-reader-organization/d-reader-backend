import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { kebabCase } from 'lodash';
import { AudienceType } from '@prisma/client';
import { TransformStringToBoolean } from 'src/utils/transform';

export class CreateComicDto {
  @IsNotEmpty()
  @MaxLength(48)
  title: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => obj.title && kebabCase(obj.title))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsBoolean()
  @TransformStringToBoolean()
  @ApiProperty({ default: true })
  isCompleted: boolean;

  @IsEnum(AudienceType)
  @ApiProperty({ enum: AudienceType })
  audienceType: AudienceType;

  @IsOptional()
  @MaxLength(1024)
  description?: string;

  @IsOptional()
  @MaxLength(128)
  flavorText?: string;

  @IsOptionalUrl()
  website?: string;

  @IsOptionalUrl()
  twitter?: string;

  @IsOptionalUrl()
  discord?: string;

  @IsOptionalUrl()
  telegram?: string;

  @IsOptionalUrl()
  instagram?: string;

  @IsOptionalUrl()
  tikTok?: string;

  @IsOptionalUrl()
  youTube?: string;

  @IsArray()
  @Type(() => String)
  @ApiProperty({ type: [String] })
  genres: string[];
}
