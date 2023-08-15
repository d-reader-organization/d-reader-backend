import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class EligibleGroupsParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  walletAddress: string;
}
