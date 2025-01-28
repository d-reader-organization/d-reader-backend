import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';
import { TransformCsvToArray } from '../../utils/transform';

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

export class ComicParams extends Pagination {
  @IsOptional()
  @IsKebabCase()
  creatorId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({ type: String })
  @Type(() => String)
  @TransformCsvToArray()
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
