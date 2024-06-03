import { IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { JsonMetadata } from '@metaplex-foundation/js';
import { DigitalAsset } from '@prisma/client';
import axios from 'axios';

export class WalletAssetDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  image: string;

  @IsString()
  name: string;
}

export async function toWalletAssetDto(asset: DigitalAsset) {
  const getAssetResponse = await axios.get<JsonMetadata>(asset.uri);
  const { data: offChainMetadataJson } = getAssetResponse;

  const plainWalletAssetDto: WalletAssetDto = {
    address: asset.address,
    image: offChainMetadataJson.image,
    name: asset.name,
  };

  const walletAssetDto = plainToInstance(WalletAssetDto, plainWalletAssetDto);
  return walletAssetDto;
}

export const toWalletAssetDtoArray = (assets: DigitalAsset[]) => {
  return Promise.all(assets.map(toWalletAssetDto));
};
