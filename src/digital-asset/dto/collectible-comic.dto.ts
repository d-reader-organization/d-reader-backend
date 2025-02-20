import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  CollectibleComic,
  ComicRarity,
  StatefulCover,
  CollectibleComicMetadata,
  CollectibleComicCollection,
} from '@prisma/client';
import { divide } from 'lodash';
import { getPublicUrl } from '../../aws/s3client';
import {
  BaseDigitalAssetDto,
  DigitalAssetType,
} from './base-digital-asset.dto';
import { PaginatedResponseDto } from 'src/types/paginated-response.dto';

export class CollectibleComicDto extends BaseDigitalAssetDto {
  @IsBoolean()
  isUsed: boolean;

  @IsBoolean()
  isSigned: boolean;

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity: ComicRarity;

  @IsNumber()
  comicIssueId: number;

  @IsBoolean()
  isListed: boolean;

  @IsOptional()
  @IsString()
  comicTitle?: string;

  @IsOptional()
  @IsString()
  comicIssueTitle?: string;
}

export type WithMetadata = { metadata: CollectibleComicMetadata };
export type WithDigitalAssetData = {
  digitalAsset: { isListed?: boolean; ownerAddress: string };
};
export type WithCollection = { collection: CollectibleComicCollection };
export type WithStatefulCovers = { statefulCovers: StatefulCover[] };
export type WithComicData = {
  comicIssueTitle?: string;
  comicTitle?: string;
  description?: string;
};
export type WithSellerFeeBasisPoints = { sellerFeeBasisPoints: number };

export type CollectibleComicInput = CollectibleComic &
  WithCollection &
  WithMetadata &
  WithDigitalAssetData &
  WithStatefulCovers &
  WithComicData;

export function toCollectibleComicDto(
  collectibleComicInput: CollectibleComicInput,
) {
  const {
    metadata,
    digitalAsset,
    statefulCovers,
    collection,
    ...collectibleComic
  } = collectibleComicInput;

  const isUsed = metadata.isUsed;
  const isSigned = metadata.isSigned;
  const rarity = metadata.rarity;

  const cover = statefulCovers.find(
    (c) =>
      c.isUsed === isUsed && c.isSigned === isSigned && c.rarity === rarity,
  );

  const plainCollectibleComicDto: CollectibleComicDto = {
    address: collectibleComic.address,
    name: collectibleComic.name,
    image: getPublicUrl(cover.image),
    ownerAddress: digitalAsset.ownerAddress,
    royalties: divide(collection.sellerFeeBasisPoints, 100),
    collectionAddress: collection.address,
    isUsed,
    isSigned,
    rarity,
    comicTitle: collectibleComic.comicTitle || undefined,
    comicIssueTitle: collectibleComic.comicIssueTitle || undefined,
    comicIssueId: cover.comicIssueId,
    isListed: digitalAsset.isListed,
    type: DigitalAssetType.CollectibleComic,
  };

  const collectibleComicDto = plainToInstance(
    CollectibleComicDto,
    plainCollectibleComicDto,
  );
  return collectibleComicDto;
}

export const toCollectibleComicDtoArray = (assets: CollectibleComicInput[]) => {
  return assets.map(toCollectibleComicDto);
};

export type PaginatedCollectibleComicInput = {
  totalItems: number;
  collectibleComics: CollectibleComicInput[];
};

export const toPaginatedCollectibleComicDto = (
  input: PaginatedCollectibleComicInput,
) => {
  const plainPaginatedCollectibleComicDto: PaginatedResponseDto<CollectibleComicDto> =
    {
      totalItems: input.totalItems,
      data: toCollectibleComicDtoArray(input.collectibleComics),
    };

  const paginatedCollectibleComicDto = plainToInstance(
    PaginatedResponseDto<CollectibleComicDto>,
    plainPaginatedCollectibleComicDto,
  );
  return paginatedCollectibleComicDto;
};
