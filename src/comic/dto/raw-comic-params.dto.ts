import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';
import { TransformCsvToArray } from '../../utils/transform';

export enum RawComicSortTag {
  Title = 'title',
  Rating = 'rating',
  Likes = 'likes',
  Readers = 'readers',
  Viewers = 'viewers',
  Published = 'published',
}

export class RawComicParams extends Pagination {
  @IsOptional()
  @IsKebabCase()
  creatorSlug?: string;

  @IsOptional()
  @IsString()
  titleSubstring?: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({ type: String })
  @Type(() => String)
  @TransformCsvToArray()
  genreSlugs?: string[];

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;

  @IsEnum(RawComicSortTag)
  @IsOptional()
  sortTag?: RawComicSortTag;
}
