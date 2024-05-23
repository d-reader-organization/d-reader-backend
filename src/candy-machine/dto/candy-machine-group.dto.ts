import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CandyMachineGroupSettings } from './types';
import { Type, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { divide, sortBy } from 'lodash';
import { WhiteListType } from '@prisma/client';

export class WalletGroupDto {
  @IsOptional()
  @IsNumber()
  itemsMinted?: number;

  @IsBoolean()
  isEligible: boolean;

  @IsOptional()
  @IsNumber()
  supply?: number;
}

export class UserGroupDto {
  @IsOptional()
  @IsNumber()
  itemsMinted?: number;

  @IsBoolean()
  isEligible: boolean;

  @IsOptional()
  @IsNumber()
  supply?: number;
}

export class CandyMachineGroupDto {
  @IsString()
  label: string;

  @IsString()
  displayLabel: string;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsNumber()
  mintPrice: number;

  @IsNumber()
  supply: number;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  splTokenAddress: string;

  @IsNumber()
  itemsMinted: number;

  @IsNumber()
  discount: number;

  @Type(() => WalletGroupDto)
  @ApiProperty({ type: WalletGroupDto })
  wallet: WalletGroupDto;

  @Type(() => UserGroupDto)
  @ApiProperty({ type: UserGroupDto })
  user: UserGroupDto;

  @IsEnum(WhiteListType)
  @ApiProperty({ enum: WhiteListType })
  whiteListType: WhiteListType;

  @IsOptional()
  @IsNumber()
  mintLimit?: number;
}

export function toCandyMachineGroupDto(group: CandyMachineGroupSettings) {
  const currentDate = new Date();

  const plainCandyMachineGroupDto: CandyMachineGroupDto = {
    label: group.label,
    displayLabel: group.displayLabel,
    startDate: group.startDate,
    endDate: group.endDate,
    mintPrice: group.mintPrice,
    isActive: group.startDate
      ? group.startDate <= currentDate && currentDate < group.endDate
      : true,
    splTokenAddress: group.splTokenAddress,
    itemsMinted: group.itemsMinted,
    mintLimit: group.mintLimit,
    discount: divide(group.discountBasisPoints, 100),
    supply: group.supply,
    wallet: {
      itemsMinted: group.walletStats.itemsMinted,
      isEligible: group.walletStats.isEligible,
      supply: group.mintLimit,
    },
    user: {
      itemsMinted: group.userStats.itemsMinted,
      isEligible: group.userStats.isEligible,
      supply: group.mintLimit,
    },
    whiteListType: group.whiteListType,
  };
  const candyMachineGroupDto = plainToInstance(
    CandyMachineGroupDto,
    plainCandyMachineGroupDto,
  );
  return candyMachineGroupDto;
}

export function toCandyMachineGroupDtoArray(
  groups: CandyMachineGroupSettings[],
) {
  const sortedGroups = sortBy(groups, (group) => {
    if (group.startDate) return group.startDate.getTime();
    else return new Date(0);
  });
  return sortedGroups.map(toCandyMachineGroupDto);
}
