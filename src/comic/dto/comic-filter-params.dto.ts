import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';

export enum ComicFilterTag {
  Popular = 'popular',
}

export enum ComicSortTag {
  Title = 'title',
  Rating = 'rating',
  Likes = 'likes',
  Readers = 'readers',
  Viewers = 'viewers',
  Published = 'published',
}

export class ComicFilterParams extends Pagination {
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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    } else return value;
  })
  genreSlugs?: string[];

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;

  @IsEnum(ComicFilterTag)
  @IsOptional()
  filterTag?: ComicFilterTag;

  @IsEnum(ComicSortTag)
  @IsOptional()
  sortTag?: ComicSortTag;
}
