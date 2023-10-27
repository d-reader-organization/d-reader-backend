import { IsOptionalString } from '../../decorators/IsOptionalString';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class CandyMachineParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsOptionalString()
  @IsSolanaAddress()
  walletAddress?: string;
}
