import { IsString } from 'class-validator';

export class CancelBidParams {
  @IsString()
  receiptAddress: string;
}
