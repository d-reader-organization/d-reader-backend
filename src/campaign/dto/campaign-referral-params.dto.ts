import { IsNumber } from 'class-validator';
import { Pagination } from '../../types/pagination.dto';
import { TransformStringToNumber } from 'src/utils/transform';

export class ReferredCampaignParams extends Pagination {}

export class CampaignReferralParams extends Pagination {
  @TransformStringToNumber()
  @IsNumber()
  id: number;
}
