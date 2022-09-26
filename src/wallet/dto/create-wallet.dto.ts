import { Exclude, Expose } from 'class-transformer';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

@Exclude()
export class CreateWalletDto {
  @Expose()
  @IsSolanaAddress()
  address: string;
}
