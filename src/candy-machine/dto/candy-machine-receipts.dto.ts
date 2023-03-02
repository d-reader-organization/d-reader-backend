import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { Pagination } from 'src/types/pagination.dto';

export class CandyMachineReceiptParams extends Pagination {
  @IsSolanaAddress()
  candyMachineAddress: string;
}
