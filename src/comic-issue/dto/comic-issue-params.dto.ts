import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';
import { TransformCsvToArray } from '../../utils/transform';

export enum ComicIssueFilterTag {
  Free = 'free',
  Popular = 'popular',
}

export enum ComicIssueSortTag {
  Title = 'title',
  Latest = 'latest',
  Rating = 'rating',
  Likes = 'likes',
  Readers = 'readers',
  Viewers = 'viewers',
}

export class ComicIssueParams extends Pagination {
  @IsOptional()
  @IsKebabCase()
  creatorSlug?: string;

  @IsOptional()
  @IsString()
  comicSlug?: string;

  @IsOptional()
  @IsKebabCase()
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

  @IsEnum(ComicIssueFilterTag)
  @IsOptional()
  filterTag?: ComicIssueFilterTag;

  @IsEnum(ComicIssueSortTag)
  @IsOptional()
  sortTag?: ComicIssueSortTag;
}
