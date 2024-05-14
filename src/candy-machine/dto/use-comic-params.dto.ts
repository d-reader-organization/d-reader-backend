import { IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UseComicParams {
  @IsSolanaAddress()
  @IsOptional()
  assetAddress: string;

  @IsSolanaAddress()
  ownerAddress: string;
}
