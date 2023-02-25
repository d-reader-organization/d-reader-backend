import { IsNumberString } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class ListParams {
  @IsSolanaAddress()
  mintAccount: string;

  @IsNumberString()
  price: number;
}
