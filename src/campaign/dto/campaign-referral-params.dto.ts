import { Pagination } from '../../types/pagination.dto';

export class ReferredCampaignParams extends Pagination {}

export class CampaignReferralParams extends Pagination {
  slug: string;
}
