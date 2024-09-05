import { IsOptional, IsString, IsEnum } from 'class-validator';
import { IsKebabCase } from '../../decorators/IsKebabCase';
import { Pagination } from '../../types/pagination.dto';
import { SortOrder } from '../../types/sort-order';

export class BasicComicIssueParams extends Pagination {
  @IsOptional()
  @IsKebabCase()
  creatorSlug?: string;

  @IsOptional()
  @IsString()
  comicSlug?: string;

  @IsOptional()
  @IsString()
  titleSubstring?: string;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}
