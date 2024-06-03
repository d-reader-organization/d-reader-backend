import { IsArray, IsInt, IsNumber, Min } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { Type, plainToInstance } from 'class-transformer';
import { CandyMachine } from '@prisma/client';
import {
  CandyMachineGroupDto,
  toCandyMachineGroupDtoArray,
} from './candy-machine-group.dto';
import { ApiProperty } from '@nestjs/swagger';
import { CandyMachineGroupSettings } from './types';
export class CandyMachineDto {
  @IsSolanaAddress()
  address: string;

  @IsInt()
  @Min(0)
  supply: number;

  @IsInt()
  @Min(0)
  itemsMinted: number;

  @IsNumber()
  discount: number;

  @IsArray()
  @Type(() => CandyMachineGroupDto)
  @ApiProperty({ type: [CandyMachineGroupDto] })
  groups: CandyMachineGroupDto[];
}

type CandyMachineWithGroups = CandyMachine & {
  groups: CandyMachineGroupSettings[];
  discount: number;
};
export async function toCandyMachineDto(candyMachine: CandyMachineWithGroups) {
  const plainCandyMachineDto: CandyMachineDto = {
    address: candyMachine.address,
    supply: candyMachine.supply,
    itemsMinted: candyMachine.itemsMinted,
    discount: candyMachine.discount,
    groups: toCandyMachineGroupDtoArray(candyMachine.groups),
  };

  const candyMachineDto = plainToInstance(
    CandyMachineDto,
    plainCandyMachineDto,
  );
  return candyMachineDto;
}

export const toCandyMachineDtoArray = (
  candyMachines: CandyMachineWithGroups[],
) => {
  return Promise.all(candyMachines.map(toCandyMachineDto));
};
