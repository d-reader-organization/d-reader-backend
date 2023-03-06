import { IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { JsonMetadata } from '@metaplex-foundation/js';
import { Nft } from '@prisma/client';
import axios from 'axios';

export class WalletAssetDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  image: string;

  @IsString()
  name: string;
}

export async function toWalletAssetDto(nft: Nft) {
  const getNftResponse = await axios.get<JsonMetadata>(nft.uri);
  const { data: offChainMetadataJson } = getNftResponse;

  const plainWalletAssetDto: WalletAssetDto = {
    address: nft.address,
    image: offChainMetadataJson.image,
    name: nft.name,
  };

  const walletAssetDto = plainToInstance(WalletAssetDto, plainWalletAssetDto);
  return walletAssetDto;
}

export const toWalletAssetDtoArray = (nfts: Nft[]) => {
  return Promise.all(nfts.map(toWalletAssetDto));
};
