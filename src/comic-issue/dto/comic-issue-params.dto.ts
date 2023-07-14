import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';

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

  @IsEnum(ComicIssueFilterTag)
  @IsOptional()
  filterTag?: ComicIssueFilterTag;

  @IsEnum(ComicIssueSortTag)
  @IsOptional()
  sortTag?: ComicIssueSortTag;
}
