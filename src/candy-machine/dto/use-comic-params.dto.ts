import { IsString } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';

export class UseComicParams {
  @IsString()
  nftAddress: string;

  @IsSolanaAddress()
  ownerAddress: string;
}
