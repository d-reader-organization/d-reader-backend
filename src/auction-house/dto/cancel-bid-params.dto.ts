import { IsOptional, IsString } from 'class-validator';

export class CancelParams {
  @IsOptional()
  @IsString()
  receiptAddress: string;

  @IsOptional()
  @IsString()
  mint: string;
}
