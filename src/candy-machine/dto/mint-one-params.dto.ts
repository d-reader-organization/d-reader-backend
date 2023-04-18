import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class MintOneParams {
  @IsSolanaAddress()
  candyMachineAddress: string;
}
