import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';

export class SendMintTransactionBodyDto {
  @IsArray()
  @Type(() => String)
  transactions: string[];
}
