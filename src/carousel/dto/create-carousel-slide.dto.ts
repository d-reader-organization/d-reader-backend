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

export class CreateCarouselSlideDto {
  @IsNumber()
  priority: number;

  @IsString()
  link: string;

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
