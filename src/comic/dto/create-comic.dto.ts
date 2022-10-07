import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { kebabCase } from 'lodash';

export class CreateComicDto {
  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsBoolean()
  isOngoing: boolean;

  @IsOptional()
  @MaxLength(256)
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
  medium?: string;

  @IsOptionalUrl()
  tikTok?: string;

  @IsOptionalUrl()
  youTube?: string;

  @IsOptionalUrl()
  magicEden?: string;

  @IsOptionalUrl()
  openSea?: string;

  @IsArray()
  @Type(() => String)
  genres: string[];
}

export class CreateComicFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  thumbnail?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  pfp?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  logo?: Express.Multer.File | null;
}

export class CreateComicSwaggerDto extends IntersectionType(
  CreateComicDto,
  CreateComicFilesDto,
) {}
