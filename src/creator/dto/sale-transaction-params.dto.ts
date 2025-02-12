import { IsNumber, IsOptional } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { TransformStringToNumber } from '../../utils/transform';

export class SaleTransactionParams extends Pagination {
  @IsOptional()
  @TransformStringToNumber()
  @IsNumber()
  creatorId?: number;
}
