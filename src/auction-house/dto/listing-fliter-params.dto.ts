import { IsOptional, Min } from 'class-validator';
import { Pagination } from 'src/types/pagination.dto';
import { Transform } from 'class-transformer';
import { TransformStringToNumber } from 'src/utils/transform';

export class ListingFilterParams extends Pagination {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value == 'string') return value.toLocaleLowerCase() == 'true';
    else return value;
  })
  isSold?: boolean;

  @Min(0)
  @TransformStringToNumber()
  comicIssueId: number;
}
