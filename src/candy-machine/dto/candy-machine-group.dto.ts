import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CandyMachineGroupSettings } from './types';
import { Type, plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { sortBy } from 'lodash';

export class WalletGroupDto {
  @IsNumber()
  itemsMinted: number;

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

  @Type(() => WalletGroupDto)
  @ApiProperty({ type: WalletGroupDto })
  wallet: WalletGroupDto;

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
    supply: group.supply,
    wallet: {
      itemsMinted: group.walletStats.itemsMinted,
      isEligible: group.walletStats.isEligible,
      supply: group.mintLimit,
    },
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
