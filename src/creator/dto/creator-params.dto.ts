import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';

export enum CreatorFilterTag {
  Popular = 'popular',
}

export enum CreatorSortTag {
  Followers = 'followers',
  Name = 'name',
}

export class CreatorFilterParams extends Pagination {
  @IsOptional()
  @IsString()
  nameSubstring?: string;

  @IsOptional()
  @IsString()
  search?: string;

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

  @IsEnum(CreatorFilterTag)
  @IsOptional()
  filterTag?: CreatorFilterTag;

  @IsEnum(CreatorSortTag)
  @IsOptional()
  sortTag?: CreatorSortTag;
}
