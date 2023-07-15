import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CarouselLocation } from '@prisma/client';
import { LanguageDto } from 'src/types/language.dto';

export class CreateCarouselSlideTranslationDto extends LanguageDto {
  @IsString()
  @IsOptional()
  @MaxLength(26)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(48)
  subtitle?: string;
}

export class CreateCarouselSlideDto extends CreateCarouselSlideTranslationDto {
  @IsNumber()
  priority: number;

  @IsEnum(CarouselLocation)
  @ApiProperty({ enum: CarouselLocation })
  location: CarouselLocation;

  @IsOptional()
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
}

export class CreateCarouselSlideFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  image?: Express.Multer.File | null;
}

export class CreateCarouselSlideSwaggerDto extends IntersectionType(
  CreateCarouselSlideDto,
  CreateCarouselSlideFilesDto,
) {}

export class CreateCarouselSlideTranslationSwaggerDto extends IntersectionType(
  CreateCarouselSlideTranslationDto,
  CreateCarouselSlideFilesDto,
) {}
