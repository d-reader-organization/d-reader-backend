import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  CollectibleComic,
  ComicRarity,
  StatefulCover,
  CollectibleComicMetadata,
} from '@prisma/client';
import { divide } from 'lodash';
import { getPublicUrl } from '../../aws/s3client';

export class CollectibleComicDto {
  @IsSolanaAddress()
  address: string;

  @IsUrl()
  uri: string;

  @IsUrl()
  image: string;

  @IsString()
  name: string;

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

  @IsOptional()
  @IsString()
  comicName?: string;

  @IsOptional()
  @IsString()
  comicIssueName?: string;

  @IsNumber()
  comicIssueId: number;

  @IsBoolean()
  isListed: boolean;
}

export type WithMetadata = { metadata: CollectibleComicMetadata };
export type WithDigitalAssetData = {
  digitalAsset: { isListed?: boolean; ownerAddress: string };
};
export type WithStatefulCovers = { statefulCovers: StatefulCover[] };
export type WithComicData = { comicIssueName?: string; comicName?: string };
export type WithSellerFeeBasisPoints = { sellerFeeBasisPoints: number };

export type CollectibleComicInput = CollectibleComic &
  WithSellerFeeBasisPoints &
  WithMetadata &
  WithDigitalAssetData &
  WithStatefulCovers &
  WithComicData;

export async function toCollectibleComicDto(
  collectibleComicInput: CollectibleComicInput,
) {
  const { metadata, digitalAsset, statefulCovers, ...collectibleComic } =
    collectibleComicInput;

  const isUsed = metadata.isUsed;
  const isSigned = metadata.isSigned;
  const rarity = metadata.rarity;

  const cover = statefulCovers.find(
    (c) =>
      c.isUsed === isUsed && c.isSigned === isSigned && c.rarity === rarity,
  );

  const plainCollectibleComicDto: CollectibleComicDto = {
    address: collectibleComic.address,
    uri: collectibleComic.uri,
    image: getPublicUrl(cover.image),
    name: collectibleComic.name,
    ownerAddress: digitalAsset.ownerAddress,
    royalties: divide(collectibleComic.sellerFeeBasisPoints, 100),
    // candyMachineAddress: nft.candyMachineAddress,
    // collectionNftAddress: nft.collectionNftAddress,
    isUsed,
    isSigned,
    rarity,
    comicName: collectibleComic.comicName || undefined,
    comicIssueName: collectibleComic.comicIssueName || undefined,
    comicIssueId: cover.comicIssueId,
    isListed: digitalAsset.isListed,
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
