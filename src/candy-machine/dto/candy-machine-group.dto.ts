import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CandyMachineGroupSettings } from './types';
import { plainToInstance } from 'class-transformer';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';

export class WalletEligibleGroupDto {
  @IsString()
  label: string;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

  @IsNumber()
  mintPrice: number;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  splTokenAddress: string;

  @IsNumber()
  itemsMinted: number;

  @IsBoolean()
  isEligible: boolean;

  @IsOptional()
  @IsNumber()
  itemsRemaing?: number;

  @IsOptional()
  @IsNumber()
  mintLimit?: number;
}

export function toWalletEligibleGroupDto(group: CandyMachineGroupSettings) {
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
    itemsRemaing = mintLimit - group.itemsMinted;
  }
  const plainWalletEligibleGroupDto: WalletEligibleGroupDto = {
    label: group.label,
    startDate,
    endDate,
    mintPrice,
    isActive: startDate <= currentDate && currentDate < endDate,
    splTokenAddress,
    isEligible: group.isEligible,
    itemsMinted: group.itemsMinted,
    mintLimit,
    itemsRemaing,
  };
  const walletEligibleGroupDto = plainToInstance(
    WalletEligibleGroupDto,
    plainWalletEligibleGroupDto,
  );
  return walletEligibleGroupDto;
}

export function toWalletEligibleGroupDtoArray(
  groups: CandyMachineGroupSettings[],
) {
  return groups.map(toWalletEligibleGroupDto);
}
