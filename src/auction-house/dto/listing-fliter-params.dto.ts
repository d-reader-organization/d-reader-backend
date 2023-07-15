import { IsOptional } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { Transform } from 'class-transformer';

export class FilterParams extends Pagination {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value == 'string') return value.toLocaleLowerCase() == 'true';
    else return value;
  })
  isSold?: boolean;
}
