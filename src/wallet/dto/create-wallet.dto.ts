import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class CreateWalletDto {
  @IsSolanaAddress()
  address: string;
}
