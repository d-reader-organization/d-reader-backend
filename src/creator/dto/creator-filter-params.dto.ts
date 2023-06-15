import { IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/types/pagination.dto';

export class CreatorFilterParams extends Pagination {
  @IsOptional()
  @IsString()
  nameSubstring?: string;

  // TODO: add filtering by creator genres?
}
