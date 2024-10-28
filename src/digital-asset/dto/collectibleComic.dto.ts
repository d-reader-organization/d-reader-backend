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
  StatefulCover,
  CollectibleComicMetadata,
} from '@prisma/client';
import { divide, isNil } from 'lodash';
import { getPublicUrl } from '../../aws/s3client';

export class CollectibleComicAttributesDto {
  trait: string;
  value: string;
}

export class CollectibleComicDto {
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
  @Type(() => CollectibleComicAttributesDto)
  @ApiProperty({ type: [CollectibleComicAttributesDto] })
  attributes: CollectibleComicAttributesDto[];

  @IsBoolean()
  isListed: boolean;
}

export type WithMetadata = { metadata: CollectibleComicMetadata };
export type WithDigitalAssetData = {
  digitalAsset: { listing?: Listing[]; ownerAddress: string };
};
export type WithStatefulCovers = { statefulCovers: StatefulCover[] };

export type CollectibleComicInput = CollectibleComic &
  WithMetadata &
  WithDigitalAssetData &
  WithStatefulCovers;

export async function toCollectibleComicDto(
  collectibleComicInput: CollectibleComicInput,
) {
  const { metadata, digitalAsset, statefulCovers, ...collectibleComic } =
    collectibleComicInput;

  const offChainMetadata = await fetchOffChainMetadata(metadata.uri);
  const listings = digitalAsset.listing;
  const isUsed = findUsedTrait(offChainMetadata);
  const isSigned = findSignedTrait(offChainMetadata);
  const rarity = findRarityTrait(offChainMetadata);

  const cover = statefulCovers.find(
    (c) =>
      c.isUsed === isUsed && c.isSigned === isSigned && c.rarity === rarity,
  );

  const plainCollectibleComicDto: CollectibleComicDto = {
    address: collectibleComic.address,
    uri: collectibleComic.uri,
    image: getPublicUrl(cover.image),
    name: collectibleComic.name,
    description: offChainMetadata.description,
    ownerAddress: digitalAsset.ownerAddress,
    royalties: divide(offChainMetadata.seller_fee_basis_points, 100),
    // candyMachineAddress: nft.candyMachineAddress,
    // collectionNftAddress: nft.collectionNftAddress,
    isUsed,
    isSigned,
    rarity,
    comicName: offChainMetadata.collection.family,
    comicIssueName: offChainMetadata.collection.name,
    comicIssueId: cover.comicIssueId,
    attributes: offChainMetadata.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
    isListed: isNil(listings) ? null : listings.length > 0 ? true : false,
  };

  const collectibleComicDto = plainToInstance(
    CollectibleComicDto,
    plainCollectibleComicDto,
  );
  return collectibleComicDto;
}

export const toCollectibleComicDtoArray = (assets: CollectibleComicInput[]) => {
  return Promise.all(assets.map(toCollectibleComicDto));
};
