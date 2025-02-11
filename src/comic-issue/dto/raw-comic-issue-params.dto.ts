import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';
import {
  TransformCsvToArray,
  TransformStringToNumber,
} from '../../utils/transform';

export enum RawComicIssueSortTag {
  Title = 'title',
  Latest = 'latest',
  Rating = 'rating',
  Likes = 'likes',
  Readers = 'readers',
  Viewers = 'viewers',
}

export class RawComicIssueParams extends Pagination {
  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  creatorId?: number;

  @IsOptional()
  @IsString()
  comicSlug?: string;

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

  @IsEnum(RawComicIssueSortTag)
  @IsOptional()
  sortTag?: RawComicIssueSortTag;
}
