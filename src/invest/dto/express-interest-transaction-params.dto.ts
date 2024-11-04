import { IsNumber } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { TransformStringToNumber } from 'src/utils/transform';

export class ExpressInterestTransactionParams {
  @IsSolanaAddress()
  walletAddress: string;

  @IsSolanaAddress()
  splTokenAddress?: string;

  @TransformStringToNumber()
  @IsNumber()
  projectId: number;
}
