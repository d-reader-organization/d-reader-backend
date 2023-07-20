import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class ChangeComicStateParams {
  @IsSolanaAddress()
  mint: string;
}
