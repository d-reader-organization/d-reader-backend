import { IsArray, IsBoolean, IsNumber, IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { plainToInstance, Type } from 'class-transformer';
import {
  fetchOffChainMetadata,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { Nft, Listing } from '@prisma/client';
import { isNil } from 'lodash';

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
  owner: string;

  @IsNumber()
  royalties: number;

  @IsBoolean()
  isUsed: boolean;

  @IsBoolean()
  isSigned: boolean;

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
  collectionNft?: {
    comicIssueId?: number;
  };
  listing?: Listing[];
};

export async function toNftDto(nft: NftInput) {
  const offChainMetadata = await fetchOffChainMetadata(nft.uri);

  const plainNftDto: NftDto = {
    address: nft.address,
    uri: nft.uri,
    image: offChainMetadata.image,
    name: nft.name,
    description: offChainMetadata.description,
    owner: nft.ownerAddress,
    royalties: offChainMetadata.seller_fee_basis_points / 100,
    // candyMachineAddress: nft.candyMachineAddress,
    // collectionNftAddress: nft.collectionNftAddress,
    isUsed: findUsedTrait(offChainMetadata),
    isSigned: findSignedTrait(offChainMetadata),
    comicName: offChainMetadata.collection.family,
    comicIssueName: offChainMetadata.collection.name,
    comicIssueId: nft.collectionNft.comicIssueId,
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
