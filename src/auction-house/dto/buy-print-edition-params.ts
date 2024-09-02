import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';

export class BuyPrintEditionParams {
  @IsSolanaAddress()
  buyerAddress: string;

  @IsSolanaAddress()
  assetAddress: string;
}
