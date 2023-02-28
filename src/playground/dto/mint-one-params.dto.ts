import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class MintOneParams {
  @IsSolanaAddress()
  candyMachineAddress: string;
}
