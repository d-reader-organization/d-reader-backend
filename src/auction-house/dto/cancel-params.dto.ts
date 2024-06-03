import { IsOptional, IsString } from 'class-validator';

export class CancelParams {
  @IsString()
  @IsOptional()
  receiptAddress?: string;

  /* @deperecated */
  @IsString()
  @IsOptional()
  nftAddress: string;

  @IsString()
  @IsOptional()
  assetAddress: string;
}
