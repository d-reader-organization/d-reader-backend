import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
  IsUrl,
} from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance, Type } from 'class-transformer';
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
} from '@prisma/client';
import { divide, isNil } from 'lodash';

export class NftAttributeDto {
  trait: string;
  value: string;
}

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
  comicName: string;

  @IsString()
  comicIssueName: string;

  @IsNumber()
  comicIssueId: number;

  @IsArray()
  @Type(() => NftAttributeDto)
  @ApiProperty({ type: [NftAttributeDto] })
  attributes: NftAttributeDto[];

  @IsBoolean()
  isListed: boolean;
}

export type AssetInput = CollectibleComic & {
  digitalAsset: { listing?: Listing[]; ownerAddress: string };
  metadata?: { collection?: CollectibleComicCollection };
};

export async function toAssetDto(asset: AssetInput) {
  const offChainMetadata = await fetchOffChainMetadata(asset.uri);
  const listings = asset.digitalAsset.listing;

  const plainNftDto: AssetDto = {
    address: asset.address,
    uri: asset.uri,
    image: offChainMetadata.image,
    name: asset.name,
    description: offChainMetadata.description,
    ownerAddress: asset.digitalAsset.ownerAddress,
    royalties: divide(offChainMetadata.seller_fee_basis_points, 100),
    // candyMachineAddress: nft.candyMachineAddress,
    // collectionNftAddress: nft.collectionNftAddress,
    isUsed: findUsedTrait(offChainMetadata),
    isSigned: findSignedTrait(offChainMetadata),
    rarity: findRarityTrait(offChainMetadata),
    comicName: offChainMetadata.collection.family,
    comicIssueName: offChainMetadata.collection.name,
    comicIssueId: asset.metadata?.collection?.comicIssueId,
    attributes: offChainMetadata.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
    isListed: isNil(listings) ? null : listings.length > 0 ? true : false,
  };

  const assetDto = plainToInstance(AssetDto, plainNftDto);
  return assetDto;
}

export const toAssetDtoArray = (assets: AssetInput[]) => {
  return Promise.all(assets.map(toAssetDto));
};
