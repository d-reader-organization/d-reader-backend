import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UseComicParams {
  @IsSolanaAddress()
  nftAddress: string;

  @IsSolanaAddress()
  ownerAddress: string;
}
