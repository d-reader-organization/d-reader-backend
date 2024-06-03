import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class SignComicParams {
  @IsSolanaAddress()
  assetAddress: string;

  @IsSolanaAddress()
  signerAddress: string;
}
