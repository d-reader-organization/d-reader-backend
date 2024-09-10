import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddCandyMachineCouponPriceConfigDto {
  @IsNumber()
  mintPrice: number;

  @IsNumber()
  usdcEquivalent: number;

  @IsNumber()
  supply: number;

  @IsOptional()
  @IsString()
  splTokenAddress?: string;
}
