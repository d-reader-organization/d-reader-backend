import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class ExecuteSaleParams {
  @IsString()
  listReceipt: string;

  @IsString()
  bidReceipt: string;

  @IsBooleanString()
  @IsOptional()
  printReceipt?: string;
}
