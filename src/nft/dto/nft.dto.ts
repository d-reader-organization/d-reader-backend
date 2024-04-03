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
import { Nft, Listing, ComicRarity, CollectionNft } from '@prisma/client';
import { divide, isNil } from 'lodash';

export class NftAttributeDto {
  trait: string;
  value: string;
}

export class NftDto {
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

type NftInput = Nft & {
  collectionNft?: CollectionNft;
  listing?: Listing[];
};

export async function toNftDto(nft: NftInput) {
  // TODO: instead of fetching this data from arweave, fetch it from our database
  // This would reflect to the new spec where NFTs might be updated in our db but
  // not on-chain (yet) due to network congestion.
  // In other words, our db is the source of truth and chain should match it.

  // Implications: what if our db falls out of sync elsewhere (e.g. NFT transfers - owner)
  const offChainMetadata = await fetchOffChainMetadata(nft.uri);

  const plainNftDto: NftDto = {
    address: nft.address,
    uri: nft.uri,
    image: offChainMetadata.image,
    name: nft.name,
    description: offChainMetadata.description,
    ownerAddress: nft.ownerAddress,
    royalties: divide(offChainMetadata.seller_fee_basis_points, 100),
    // candyMachineAddress: nft.candyMachineAddress,
    // collectionNftAddress: nft.collectionNftAddress,
    isUsed: findUsedTrait(offChainMetadata),
    isSigned: findSignedTrait(offChainMetadata),
    rarity: findRarityTrait(offChainMetadata),
    comicName: offChainMetadata.collection.family,
    comicIssueName: offChainMetadata.collection.name,
    comicIssueId: nft.collectionNft?.comicIssueId,
    attributes: offChainMetadata.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
    isListed: isNil(nft.listing) ? null : nft.listing.length > 0 ? true : false,
  };

  const nftDto = plainToInstance(NftDto, plainNftDto);
  return nftDto;
}

export const toNftDtoArray = (nfts: Nft[]) => {
  return Promise.all(nfts.map(toNftDto));
};
