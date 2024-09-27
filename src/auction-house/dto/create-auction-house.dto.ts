import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAuctionHouseDto {
  @IsString()
  treasuryMintAddress: string;

  @IsNumber()
  sellerFeeBasisPoints: number;

  @IsOptional()
  @IsBoolean()
  requiresSignOff?: boolean;

  @IsOptional()
  @IsBoolean()
  canChangeSalePrice?: boolean;
}
