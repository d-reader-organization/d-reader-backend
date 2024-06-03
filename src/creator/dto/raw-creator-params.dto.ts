import { IsOptional, IsString } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';

export class RawCreatorFilterParams extends Pagination {
  @IsOptional()
  @IsString()
  nameSubstring?: string;
}
