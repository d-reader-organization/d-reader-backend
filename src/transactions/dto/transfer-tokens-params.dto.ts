import { IsNumber, IsOptional, Min } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { TransformStringToNumber } from '../../utils/transform';

export class TransferTokensParams {
  @IsSolanaAddress()
  senderAddress: string;

  @IsSolanaAddress()
  receiverAddress: string;

  @TransformStringToNumber()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsSolanaAddress()
  tokenAddress?: string;
}
