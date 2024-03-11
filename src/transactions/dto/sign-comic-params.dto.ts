import { IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class SignComicParams {
  @IsString()
  nftAddress: string;

  @IsSolanaAddress()
  signerAddress: string;
}
