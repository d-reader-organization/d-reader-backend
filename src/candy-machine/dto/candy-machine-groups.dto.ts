import { IsBoolean, IsDate, IsString } from 'class-validator';
import { CandyMachineGroupSettings } from './types';
import { plainToInstance } from 'class-transformer';

export class CandyMachineGroupDto {
  @IsString()
  label: string;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

  @IsBoolean()
  isActive: boolean;
}

export function toCandyMachineGroupDto(group: CandyMachineGroupSettings) {
  const startDate = new Date(group.guards.startDate.date.toNumber() * 1000);
  const endDate = new Date(group.guards.endDate.date.toNumber() * 1000);
  const currentDate = new Date();
  const plainCandyMachineGroupDto: CandyMachineGroupDto = {
    label: group.label,
    startDate,
    endDate,
    isActive: startDate < currentDate && currentDate < endDate,
  };
  const candyMachineGroupDto = plainToInstance(
    CandyMachineGroupDto,
    plainCandyMachineGroupDto,
  );
  return candyMachineGroupDto;
}

export function toCandyMachineGroupsDto(groups: CandyMachineGroupSettings[]) {
  return groups.map((group) => toCandyMachineGroupDto(group));
}
