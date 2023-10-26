import { IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class CandyMachineParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsOptional()
  @IsSolanaAddress()
  walletAddress?: string;
}
