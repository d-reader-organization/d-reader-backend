import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransformDateStringToDate } from '../../utils/transform';
import { CouponType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class AddCandyMachineCouponDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  mintPrice: number;

  @IsNumber()
  usdcEquivalent: number;

  @IsNumber()
  supply: number;

  @IsOptional()
  @IsString()
  splTokenAddress?: string;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  startsAt?: Date;

  @IsDate()
  @IsOptional()
  @TransformDateStringToDate()
  expiresAt?: Date;

  @IsOptional()
  @IsNumber()
  numberOfRedemptions?: number;

  @IsEnum(CouponType)
  @ApiProperty({ enum: CouponType })
  couponType: CouponType;
}
