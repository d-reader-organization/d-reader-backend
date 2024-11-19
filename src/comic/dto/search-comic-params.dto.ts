import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';

export class SearchComicParams extends Pagination {
  @IsString()
  titleSubstring: string;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}
