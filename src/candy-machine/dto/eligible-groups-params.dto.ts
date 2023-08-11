import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Pagination } from '../../types/pagination.dto';

export class EligibleGroupsParams extends Pagination {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  walletAddress: string;
}
