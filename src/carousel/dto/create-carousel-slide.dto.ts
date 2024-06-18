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
import { TransformStringToNumber } from 'src/utils/transform';

export class CreateCarouselSlideBodyDto {
  @TransformStringToNumber()
  @IsNumber()
  priority: number;

  @IsString()
  @IsOptional()
  @MaxLength(26)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(48)
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
