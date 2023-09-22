import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CandyMachineGroupSettings } from './types';
import { Type, plainToInstance } from 'class-transformer';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { ApiProperty } from '@nestjs/swagger';

export class WalletGroupDto {
  @IsNumber()
  itemsMinted: number;

  @IsBoolean()
  isEligible: boolean;

  @IsOptional()
  @IsNumber()
  itemsRemaing?: number;
}
export class CandyMachineGroupDto {
  @IsString()
  label: string;

  @IsString()
  displayLabel: string;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

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
  const startDate = new Date(group.guards.startDate.date.toNumber() * 1000);
  const endDate = new Date(group.guards.endDate.date.toNumber() * 1000);
  const currentDate = new Date();
  let mintPrice: number,
    splTokenAddress: string,
    mintLimit: number,
    itemsRemaing: number;
  if (group.guards.freezeSolPayment) {
    mintPrice = group.guards.freezeSolPayment.amount.basisPoints.toNumber();
    splTokenAddress = WRAPPED_SOL_MINT.toBase58();
  } else {
    mintPrice = group.guards.freezeTokenPayment.amount.basisPoints.toNumber();
    splTokenAddress = group.guards.freezeTokenPayment.mint.toBase58();
  }
  if (group.guards.mintLimit) {
    mintLimit = group.guards.mintLimit.limit;
    itemsRemaing = mintLimit - group.walletSettings.itemsMinted;
  }
  const plainCandyMachineGroupDto: CandyMachineGroupDto = {
    label: group.label,
    startDate,
    endDate,
    mintPrice,
    isActive: startDate <= currentDate && currentDate < endDate,
    splTokenAddress,
    itemsMinted: group.itemsMinted,
    mintLimit,
    displayLabel: group.displayLabel,
    supply: group.supply,
    wallet: {
      itemsMinted: group.walletSettings.itemsMinted,
      itemsRemaing,
      isEligible: group.walletSettings.isEligible,
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
  return groups.map(toCandyMachineGroupDto);
}
