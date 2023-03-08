import { IsString } from 'class-validator';

export class CancelParams {
  @IsString()
  receiptAddress: string;
}
