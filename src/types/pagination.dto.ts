import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, Max, Min } from 'class-validator';
import { SortOrder } from './sort-order';
import { FilterTag, SortTag } from './query-tags';

export class Pagination {
  @Min(0)
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  skip: number;

  @Min(1)
  @Max(20)
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  take: number;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;

  @IsEnum(FilterTag)
  @IsOptional()
  filterTag?: FilterTag;

  @IsEnum(SortTag)
  @IsOptional()
  sortTag?: SortTag;
}
