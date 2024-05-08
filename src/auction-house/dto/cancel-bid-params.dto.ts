import { IsOptional, IsString } from 'class-validator';

export class CancelParams {
  @IsString()
  @IsOptional()
  receiptAddress?: string;

  @IsString()
  @IsOptional()
  nftAddress: string;

  /* @deperecated */
  @IsString()
  @IsOptional()
  assetAddress: string;
}
