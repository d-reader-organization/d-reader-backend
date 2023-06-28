import { ComicRarity } from 'dreader-comic-verse';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeComicStateParams {
  @IsSolanaAddress()
  candyMachineAddress: string;

  @IsSolanaAddress()
  collectionNft: string;

  @IsSolanaAddress()
  mint: string;

  @ApiProperty({ enum: ComicRarity })
  @IsEnum(ComicRarity)
  rarity: ComicRarity;
}
