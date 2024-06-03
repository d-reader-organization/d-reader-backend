import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Pagination } from '../../types/pagination.dto';

export class CandyMachineReceiptParams extends Pagination {
  @IsSolanaAddress()
  candyMachineAddress: string;
}
