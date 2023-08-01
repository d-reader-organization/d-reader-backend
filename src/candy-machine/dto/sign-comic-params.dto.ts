import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class SignComicParams {
  @IsSolanaAddress()
  nftAddress: string;

  @IsSolanaAddress()
  signerAddress: string;
}
