import { IsOptional, IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class ExpressInterestTransactionParams {
  @IsSolanaAddress()
  walletAddress: string;

  @IsOptional()
  @IsSolanaAddress()
  splTokenAddress?: string;

  @IsString()
  projectSlug: string;
}
