import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAuctionHouseDto {
  @IsString()
  treasuryAddress: string;

  @IsNumber()
  sellerFeeBasisPoints: number;

  @IsOptional()
  @IsBoolean()
  requiresSignOff?: boolean;

  @IsOptional()
  @IsBoolean()
  canChangeSalePrice?: boolean;
}
