import { IsBoolean, IsDate, IsNumber, IsString } from 'class-validator';
import { CandyMachineGroupSettings } from './types';
import { plainToInstance } from 'class-transformer';

export class CandyMachineGroupDto {
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

  //TODO:
  // mintLimit: number
  // splTokenAddress: string
}

//TODO:
// interface UserCandyMachineGroup extends CandyMachineGroupDto {
//   userId: number;
//   itemsMinted: number; (number of items minted with this group by this user)
//   itemsRemaing: number ;
//   isEligible: boolean;
// }

// TODO: transaction/mint -> transaction/mint { itemsToMint: number = 1, groupLabel: string }

export function toCandyMachineGroupDto(group: CandyMachineGroupSettings) {
  const startDate = new Date(group.guards.startDate.date.toNumber() * 1000);
  const endDate = new Date(group.guards.endDate.date.toNumber() * 1000);
  const currentDate = new Date();
  const plainCandyMachineGroupDto: CandyMachineGroupDto = {
    label: group.label,
    startDate,
    endDate,
    mintPrice: group.guards.freezeSolPayment.amount.basisPoints.toNumber(),
    isActive: startDate <= currentDate && currentDate < endDate,
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
