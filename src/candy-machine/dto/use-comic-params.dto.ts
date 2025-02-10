import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UseComicParams {
  @IsSolanaAddress()
  assetAddress: string;
}
