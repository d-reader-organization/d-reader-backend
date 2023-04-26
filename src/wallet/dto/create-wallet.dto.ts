import { IsString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class CreateWalletDto {
  @IsSolanaAddress()
  address: string;

  @IsString()
  name: string;
}
