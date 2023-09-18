import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { TransformStringToNumber } from 'src/utils/transform';

export class TipCreatorParams {
  @TransformStringToNumber()
  creatorId: number;

  @TransformStringToNumber()
  tipAmount: number;

  @IsSolanaAddress()
  splTokenAddress: string;
}
