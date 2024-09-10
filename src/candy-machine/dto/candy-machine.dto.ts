import { IsArray, IsInt, Min } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Type, plainToInstance } from 'class-transformer';
import { CandyMachine } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { CandyMachineCouponWithStats } from './types';
import {
  CandyMachineCouponDto,
  toCandyMachineCouponDtoArray,
} from './candy-machine-coupon.dto';
export class CandyMachineDto {
  @IsSolanaAddress()
  address: string;

  @IsInt()
  @Min(0)
  supply: number;

  @IsInt()
  @Min(0)
  itemsMinted: number;

  @IsArray()
  @Type(() => CandyMachineCouponDto)
  @ApiProperty({ type: [CandyMachineCouponDto] })
  coupons: CandyMachineCouponDto[];
}

type CandyMachineWithCoupons = CandyMachine & {
  coupons: CandyMachineCouponWithStats[];
};

export async function toCandyMachineDto(candyMachine: CandyMachineWithCoupons) {
  const plainCandyMachineDto: CandyMachineDto = {
    address: candyMachine.address,
    supply: candyMachine.supply,
    itemsMinted: candyMachine.itemsMinted,
    coupons: toCandyMachineCouponDtoArray(candyMachine.coupons),
  };

  const candyMachineDto = plainToInstance(
    CandyMachineDto,
    plainCandyMachineDto,
  );
  return candyMachineDto;
}

export const toCandyMachineDtoArray = (
  candyMachines: CandyMachineWithCoupons[],
) => {
  return Promise.all(candyMachines.map(toCandyMachineDto));
};
