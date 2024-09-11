import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddCandyMachineCouponCurrencySettingDto {
  @IsNumber()
  mintPrice: number;

  @IsNumber()
  usdcEquivalent: number;

  @IsOptional()
  @IsString()
  splTokenAddress?: string;
}
