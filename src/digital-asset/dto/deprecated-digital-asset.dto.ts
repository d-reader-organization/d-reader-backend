import { IsBoolean, IsEnum, IsNumber, IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';
import { ApiProperty } from '@nestjs/swagger';
import {
  CollectibleComic,
  Listing,
  ComicRarity,
  CollectibleComicCollection,
  StatefulCover,
} from '@prisma/client';
import { divide, isNil } from 'lodash';
import { getPublicUrl } from '../../aws/s3client';

export class AssetDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  uri: string;

  @IsUrl()
  image: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsSolanaAddress()
  ownerAddress: string;

  @IsNumber()
  royalties: number;

  @IsBoolean()
  isUsed: boolean;

  @IsBoolean()
  isSigned: boolean;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity: ComicRarity;

  @IsString()
  comicTitle: string;

  @IsString()
  comicIssueName: string;

  @IsNumber()
  comicIssueId: number;

  @IsBoolean()
  isListed: boolean;
}

export type AssetInput = CollectibleComic & {
  digitalAsset: { listing?: Listing[]; ownerAddress: string };
  metadata: {
    collection: CollectibleComicCollection & {
      comicIssue: { statefulCovers: StatefulCover[] };
    };
  };
};

export async function toAssetDto(asset: AssetInput) {
  const offChainMetadata = await fetchOffChainMetadata(asset.uri);
  const listings = asset.digitalAsset.listing;
  const isUsed = findUsedTrait(offChainMetadata);
  const isSigned = findSignedTrait(offChainMetadata);
  const rarity = findRarityTrait(offChainMetadata);

  const cover = asset.metadata?.collection?.comicIssue?.statefulCovers.find(
    (c) =>
      c.isUsed === isUsed && c.isSigned === isSigned && c.rarity === rarity,
  );

  const plainNftDto: AssetDto = {
    address: asset.address,
    uri: asset.uri,
    image: getPublicUrl(cover.image),
    name: asset.name,
    description: offChainMetadata.description,
    ownerAddress: asset.digitalAsset.ownerAddress,
    royalties: divide(offChainMetadata.seller_fee_basis_points, 100),
    isUsed,
    isSigned,
    rarity,
    comicTitle: offChainMetadata.collection.family,
    comicIssueName: offChainMetadata.collection.name,
    comicIssueId: asset.metadata?.collection?.comicIssueId,

    isListed: isNil(listings) ? null : listings.length > 0 ? true : false,
  };

  const assetDto = plainToInstance(AssetDto, plainNftDto);
  return assetDto;
}

export const toAssetDtoArray = (assets: AssetInput[]) => {
  return Promise.all(assets.map(toAssetDto));
};
