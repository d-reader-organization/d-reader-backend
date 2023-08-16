import { IsOptional, Min } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { Transform } from 'class-transformer';

export class ListingFilterParams extends Pagination {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value == 'string') return value.toLocaleLowerCase() == 'true';
    else return value;
  })
  isSold?: boolean;

  @Min(0)
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  comicIssueId: number;
}
