import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CarouselLocation } from '@prisma/client';
import {
  TransformDateStringToDate,
  TransformStringToNumber,
} from '../../utils/transform';

export class CreateCarouselSlideBodyDto {
  @TransformStringToNumber()
  @IsNumber()
  priority: number;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  subtitle?: string;

  @IsEnum(CarouselLocation)
  @ApiProperty({ enum: CarouselLocation })
  location: CarouselLocation;

  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  comicIssueId?: number;

  @IsOptional()
  @IsString()
  comicSlug?: string;

  @IsOptional()
  @IsString()
  creatorSlug?: string;

  @IsOptional()
  @IsString()
  externalLink?: string;

  @IsOptional()
  @TransformDateStringToDate()
  @IsDate()
  expiredAt?: Date;
}

export class CreateCarouselSlideFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image?: Express.Multer.File | null;
}

export class CreateCarouselSlideDto extends IntersectionType(
  CreateCarouselSlideBodyDto,
  CreateCarouselSlideFilesDto,
) {}
