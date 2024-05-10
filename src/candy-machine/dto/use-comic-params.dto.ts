import { IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UseComicParams {
  /* @deprecated */
  @IsSolanaAddress()
  @IsOptional()
  nftAddress: string;

  @IsSolanaAddress()
  @IsOptional()
  assetAddress: string;

  @IsSolanaAddress()
  ownerAddress: string;
}
