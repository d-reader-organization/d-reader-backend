import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CandyMachineCouponWithStats } from './types';
import { Type, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';

export class CouponStatsDto {
  @IsOptional()
  @IsNumber()
  itemsMinted?: number;

  @IsBoolean()
  isEligible: boolean;
}

export class CandyMachineCouponPriceConfigDto {
  @IsNumber()
  mintPrice: number;

  @IsString()
  splTokenAddress: string;

  @IsNumber()
  usdcEquivalent: number;
}

export class CandyMachineCouponDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @IsOptional()
  @IsNumber()
  numberOfRedemptions?: number;

  @IsEnum(CouponType)
  @ApiProperty({ enum: CouponType })
  type: CouponType;

  @Type(() => CouponStatsDto)
  @ApiProperty({ type: CouponStatsDto })
  stats: CouponStatsDto;

  @Type(() => CandyMachineCouponPriceConfigDto)
  @ApiProperty({ type: [CandyMachineCouponPriceConfigDto] })
  prices: CandyMachineCouponPriceConfigDto[];
}

export function toCandyMachineCouponDto(coupon: CandyMachineCouponWithStats) {
  const plainCandyMachineCouponDto: CandyMachineCouponDto = {
    id: coupon.id,
    name: coupon.name,
    description: coupon.description,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    numberOfRedemptions: coupon.numberOfRedemptions,
    prices: coupon.prices,
    stats: {
      itemsMinted: coupon.stats.itemsMinted,
      isEligible: coupon.stats.isEligible,
    },
    type: coupon.type,
  };

  const candyMachineCouponDto = plainToInstance(
    CandyMachineCouponDto,
    plainCandyMachineCouponDto,
  );

  return candyMachineCouponDto;
}

export function toCandyMachineCouponDtoArray(
  coupons: CandyMachineCouponWithStats[],
) {
  return coupons.map(toCandyMachineCouponDto);
}
