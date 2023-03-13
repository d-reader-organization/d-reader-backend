import { IsArray, IsBoolean, IsNumber, IsString, IsUrl } from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import { plainToInstance, Type } from 'class-transformer';
import { SIGNED_TRAIT, USED_TRAIT } from 'src/constants';
import { JsonMetadata } from '@metaplex-foundation/js';
import { ApiProperty } from '@nestjs/swagger';
import { Nft } from '@prisma/client';
import { isNil } from 'lodash';
import axios from 'axios';

// TODO v2: extend JsonMetadata to formats which we use
// type ComicIssueJsonMetadata = JsonMetadata & {
//   attributes: ...
// }

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
  isMintCondition: boolean;

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
}

type NftInput = Nft & {
  collectionNft?: {
    comicIssueId?: number;
  };
};

export async function toNftDto(nft: NftInput) {
  const getNftResponse = await axios.get<JsonMetadata>(nft.uri);
  const { data: offChainMetadataJson } = getNftResponse;

  const usedTrait = offChainMetadataJson.attributes.find(
    (a) => a.trait_type === USED_TRAIT,
  );
  const signedTrait = offChainMetadataJson.attributes.find(
    (a) => a.trait_type === SIGNED_TRAIT,
  );

  const plainNftDto: NftDto = {
    address: nft.address,
    uri: nft.uri,
    image: offChainMetadataJson.image,
    name: nft.name,
    description: offChainMetadataJson.description,
    owner: nft.ownerAddress,
    royalties: offChainMetadataJson.seller_fee_basis_points / 100,
    // candyMachineAddress: nft.candyMachineAddress,
    // collectionNftAddress: nft.collectionNftAddress,
    isMintCondition: isNil(usedTrait) ? undefined : usedTrait.value === 'true',
    isSigned: isNil(signedTrait) ? undefined : signedTrait.value === 'true',
    comicName: offChainMetadataJson.collection.family,
    comicIssueName: offChainMetadataJson.collection.name,
    comicIssueId: nft.collectionNft.comicIssueId,
    attributes: offChainMetadataJson.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
  };

  const nftDto = plainToInstance(NftDto, plainNftDto);
  return nftDto;
}

export const toNftDtoArray = (nfts: Nft[]) => {
  return Promise.all(nfts.map(toNftDto));
};
