import { IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { JsonMetadata } from '@metaplex-foundation/js';
import { CollectibleComic } from '@prisma/client';
import axios from 'axios';

export class WalletAssetDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  image: string;

  @IsString()
  name: string;
}

export async function toWalletAssetDto(collectibleComic: CollectibleComic) {
  const getAssetResponse = await axios.get<JsonMetadata>(collectibleComic.uri);
  const { data: offChainMetadataJson } = getAssetResponse;

  const plainWalletAssetDto: WalletAssetDto = {
    address: collectibleComic.address,
    image: offChainMetadataJson.image,
    name: collectibleComic.name,
  };

  const walletAssetDto = plainToInstance(WalletAssetDto, plainWalletAssetDto);
  return walletAssetDto;
}

export const toWalletAssetDtoArray = (assets: CollectibleComic[]) => {
  return Promise.all(assets.map(toWalletAssetDto));
};
