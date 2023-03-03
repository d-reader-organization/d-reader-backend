import { IsDateString, IsNumber, IsOptional } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { CandyMachine } from '@prisma/client';

export class CandyMachineDto {
  @IsSolanaAddress()
  address: string;

  @IsNumber()
  supply: number;

  @IsNumber()
  itemsMinted: number;

  @IsNumber()
  baseMintPrice: number;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

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
