import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class CreateWalletDto {
  @IsSolanaAddress()
  address: string;
}
