import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class CandyMachineParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  walletAddress: string;
}
