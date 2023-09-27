import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { CandyMachine } from '@prisma/client';

export class CandyMachineDto {
  @IsSolanaAddress()
  address: string;

  @IsInt()
  @Min(0)
  supply: number;

  @IsInt()
  @Min(0)
  itemsMinted: number;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export async function toCandyMachineDto(candyMachine: CandyMachine) {
  const plainCandyMachineDto: CandyMachineDto = {
    address: candyMachine.address,
    supply: candyMachine.itemsAvailable,
    itemsMinted: candyMachine.itemsMinted,
  };

  const candyMachineDto = plainToInstance(
    CandyMachineDto,
    plainCandyMachineDto,
  );
  return candyMachineDto;
}

export const toCandyMachineDtoArray = (candyMachines: CandyMachine[]) => {
  return Promise.all(candyMachines.map(toCandyMachineDto));
};
