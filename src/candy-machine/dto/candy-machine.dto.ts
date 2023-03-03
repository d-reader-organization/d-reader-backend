import { IsBoolean, IsNumber } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { CandyMachine } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

export class CandyMachineDto {
  @IsSolanaAddress()
  address: string;

  @IsSolanaAddress()
  mintAuthorityAddress: string;

  @IsNumber()
  itemsAvailable: number;

  @IsNumber()
  itemsMinted: number;

  @IsNumber()
  itemsRemaining: number;

  @IsNumber()
  itemsLoaded: number;

  @IsBoolean()
  isFullyLoaded: boolean;
}

export async function toCandyMachineDto(candyMachine: CandyMachine) {
  const plainCandyMachineDto: CandyMachineDto = {
    address: candyMachine.address,
    mintAuthorityAddress: candyMachine.mintAuthorityAddress,
    itemsAvailable: candyMachine.itemsAvailable,
    itemsMinted: candyMachine.itemsMinted,
    itemsRemaining: candyMachine.itemsRemaining,
    itemsLoaded: candyMachine.itemsLoaded,
    isFullyLoaded: candyMachine.isFullyLoaded,
  };

  const candyMachineDto = plainToInstance(
    CandyMachineDto,
    plainCandyMachineDto,
  );
  return candyMachineDto;
}
