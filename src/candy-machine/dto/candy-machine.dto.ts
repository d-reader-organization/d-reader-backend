import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { CandyMachine } from '@prisma/client';
import { IsLamport } from '../../decorators/IsLamport';

export class CandyMachineDto {
  @IsSolanaAddress()
  address: string;

  @IsInt()
  @Min(0)
  supply: number;

  @IsInt()
  @Min(0)
  itemsMinted: number;

  @IsLamport()
  baseMintPrice: number;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

// TODO: VERY IMPORTANT
// endsAt is null in the database
// we need to figure out how to properly handle CandyMachineGroups
// frontend needs to implement these changes
export async function toCandyMachineDto(candyMachine: CandyMachine) {
  const plainCandyMachineDto: CandyMachineDto = {
    address: candyMachine.address,
    supply: candyMachine.itemsAvailable,
    itemsMinted: candyMachine.itemsMinted,
    baseMintPrice: candyMachine.baseMintPrice,
    endsAt: candyMachine.endsAt?.toISOString(),
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
