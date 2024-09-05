import { IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { JsonMetadata } from '@metaplex-foundation/js';
import axios from 'axios';
import {
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';
import { getPublicUrl } from '../../aws/s3client';
import {
  CollectibleComic,
  CollectibleComicCollection,
  StatefulCover,
} from '@prisma/client';

export class WalletAssetDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  image: string;

  @IsString()
  name: string;
}

export type WalletAssetInput = CollectibleComic & {
  metadata: {
    collection: CollectibleComicCollection & {
      comicIssue: { statefulCovers: StatefulCover[] };
    };
  };
};

export async function toWalletAssetDto(asset: WalletAssetInput) {
  const getAssetResponse = await axios.get<JsonMetadata>(asset.uri);
  const { data: offChainMetadataJson } = getAssetResponse;
  const isUsed = findUsedTrait(offChainMetadataJson);
  const isSigned = findSignedTrait(offChainMetadataJson);
  const rarity = findRarityTrait(offChainMetadataJson);

  const cover = asset.metadata?.collection?.comicIssue?.statefulCovers.find(
    (c) =>
      c.isUsed === isUsed && c.isSigned === isSigned && c.rarity === rarity,
  );

  const plainWalletAssetDto: WalletAssetDto = {
    address: asset.address,
    image: getPublicUrl(cover.image),
    name: asset.name,
  };

  const walletAssetDto = plainToInstance(WalletAssetDto, plainWalletAssetDto);
  return walletAssetDto;
}

export const toWalletAssetDtoArray = (assets: WalletAssetInput[]) => {
  return Promise.all(assets.map(toWalletAssetDto));
};
