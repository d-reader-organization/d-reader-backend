import { ComicRarity } from 'dreader-comic-verse';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { IsEnum } from 'class-validator';

export class SignComicParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  collectionNft: string;

  @IsSolanaAddress()
  mint: string;

  @IsEnum(ComicRarity)
  rarity: ComicRarity;
}
