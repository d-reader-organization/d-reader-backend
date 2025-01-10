import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
} from 'class-validator';
import { CarouselLocation } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { getPublicUrl } from 'src/aws/s3client';
import { CarouselWithTags } from 'src/types/carousel';

export class CarouselTagDto {
  @IsString()
  title: string;

  @IsDateString()
  @IsOptional()
  timestamp?: string;
}

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
  creatorHandle?: string;

  @IsOptional()
  @IsString()
  externalLink?: string;

  @IsOptional()
  @Type(() => CarouselTagDto)
  @IsArray()
  tags?: CarouselTagDto[];
}

export function toCarouselSlideDto(slide: CarouselWithTags) {
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
    creatorHandle: slide.creatorHandle,
    externalLink: slide.externalLink,
    tags: slide.tags,
  };

  const slideDto = plainToInstance(CarouselSlideDto, plainSlideDto);
  return slideDto;
}

export const toCarouselSlideDtoArray = (slides: CarouselWithTags[]) => {
  return slides.map(toCarouselSlideDto);
};
