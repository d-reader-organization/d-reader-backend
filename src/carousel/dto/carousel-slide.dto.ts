import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';
import { CarouselSlide, CarouselLocation } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { getPublicUrl } from 'src/aws/s3client';

export class CarouselSlideDto {
  @IsPositive()
  id: number;

  @IsUrl()
  image: string;

  @IsNumber()
  priority: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsBoolean()
  isPublished: boolean;

  @IsBoolean()
  isExpired: boolean;

  @IsEnum(CarouselLocation)
  @ApiProperty({ enum: CarouselLocation })
  location: CarouselLocation;

  @IsOptional()
  @IsInt()
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

export function toCarouselSlideDto(slide: CarouselSlide) {
  const currentDate = new Date();

  const plainSlideDto: CarouselSlideDto = {
    id: slide.id,
    image: getPublicUrl(slide.image),
    priority: slide.priority,
    title: slide.title,
    subtitle: slide.subtitle,
    isPublished: !!slide.publishedAt,
    isExpired: slide.expiredAt <= currentDate,
    location: slide.location,
    comicIssueId: slide.comicIssueId,
    comicSlug: slide.comicSlug,
    creatorSlug: slide.creatorSlug,
    externalLink: slide.externalLink,
  };

  const slideDto = plainToInstance(CarouselSlideDto, plainSlideDto);
  return slideDto;
}

export const toCarouselSlideDtoArray = (slides: CarouselSlide[]) => {
  return slides.map(toCarouselSlideDto);
};
