import { IsNumber } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';

export class WheelRewardHistoryParams extends Pagination {
  @IsNumber()
  wheelId: number;
}
