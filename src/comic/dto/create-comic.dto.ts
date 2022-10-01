import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { IsOptionalUrl } from 'src/decorators/IsOptionalUrl';
import { IsKebabCase } from 'src/decorators/IsKebabCase';
import { kebabCase } from 'lodash';

export class CreateComicDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(54)
  name: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.name))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @Expose()
  @IsBoolean()
  isOngoing: boolean;

  @Expose()
  @MaxLength(256)
  description?: string;

  @Expose()
  @MaxLength(128)
  flavorText?: string;

  @Expose()
  @IsOptionalUrl()
  website?: string;

  @Expose()
  @IsOptionalUrl()
  twitter?: string;

  @Expose()
  @IsOptionalUrl()
  discord?: string;

  @Expose()
  @IsOptionalUrl()
  telegram?: string;

  @Expose()
  @IsOptionalUrl()
  instagram?: string;

  @Expose()
  @IsOptionalUrl()
  medium?: string;

  @Expose()
  @IsOptionalUrl()
  tikTok?: string;

  @Expose()
  @IsOptionalUrl()
  youTube?: string;

  @Expose()
  @IsOptionalUrl()
  magicEden?: string;

  @Expose()
  @IsOptionalUrl()
  openSea?: string;
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
