import { IsNumber, IsOptional, Min } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { TransformStringToNumber } from '../../utils/transform';

export class CreatorTipParams {
  @IsSolanaAddress()
  user: string;

  @IsSolanaAddress()
  tippingAddress: string;

  @TransformStringToNumber()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsSolanaAddress()
  mint?: string;
}
