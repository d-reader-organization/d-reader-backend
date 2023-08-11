import { ApiProperty, IntersectionType } from '@nestjs/swagger';
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

export class CreateComicBodyDto {
  @IsNotEmpty()
  @MaxLength(48)
  title: string;

  @Expose()
  @IsKebabCase()
  @Transform(({ obj }) => kebabCase(obj.title))
  @ApiProperty({ readOnly: true, required: false })
  slug: string;

  @IsBoolean()
  @Transform(({ value }) =>
    typeof value === 'string' ? Boolean(value) : value,
  )
  @ApiProperty({ default: true })
  isCompleted: boolean;

  @IsEnum(AudienceType)
  @ApiProperty({ enum: AudienceType })
  audienceType: AudienceType;

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
  tikTok?: string;

  @IsOptionalUrl()
  youTube?: string;

  @Expose()
  @IsArray()
  @IsOptional()
  @Type(() => String)
  @ApiProperty({ type: [String], required: false })
  @Transform(({ value }: { value: string[] | string }) => {
    if (value && typeof value === 'string') {
      return value.split(',');
    } else return value || [];
  })
  genres: string[];
}

export class CreateComicFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  cover?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  banner?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  pfp?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  logo?: Express.Multer.File | null;
}

export class CreateComicDto extends IntersectionType(
  CreateComicBodyDto,
  CreateComicFilesDto,
) {}
