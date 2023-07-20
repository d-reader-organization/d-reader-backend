import { IsOptional, IsString } from 'class-validator';

export class CancelParams {
  @IsString()
  @IsOptional()
  receiptAddress?: string;

  @IsString()
  @IsOptional()
  mint: string;
}
