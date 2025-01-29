import { IsNumber } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { TransformStringToNumber } from 'src/utils/transform';

export class WheelRewardHistoryParams extends Pagination {
  @TransformStringToNumber()
  @IsNumber()
  wheelId: number;
}
