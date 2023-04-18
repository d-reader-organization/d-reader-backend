import axios from 'axios';
import { Type, plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import {
  JsonMetadata,
  Pda,
  associatedTokenProgram,
  tokenProgram,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { BasicWalletDto } from '../../candy-machine/dto/candy-machine-receipt.dto';
import { SIGNED_TRAIT, USED_TRAIT } from '../../constants';
import { NftAttributeDto } from '../../nft/dto/nft.dto';
import { Listing, Wallet, Nft } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { isNil } from 'lodash';

export class ListingDto {
  @IsPositive()
  id: number;

  @IsSolanaAddress()
  @IsString()
  nftAddress: string;

  @IsString()
  name: string;

  @IsString()
  cover: string;

  @Type(() => BasicWalletDto)
  seller: BasicWalletDto;

  @IsString()
  tokenAddress: string;

  @IsInt()
  price: number;

  @IsArray()
  @Type(() => NftAttributeDto)
  @ApiProperty({ type: [NftAttributeDto] })
  attributes: NftAttributeDto[];

  @IsBoolean()
  isUsed: boolean;

  @IsBoolean()
  isSigned: boolean;

  // @IsString()
  // description: string;

  // @IsString()
  // symbol: string;

  // @IsDateString()
  // createdAt: string;

  // @IsNumber()
  // royalties: number;

  // @IsString()
  // collectionName: string;

  // @IsString()
  // externalUrl: string;

  // @IsArray()
  // @ArrayNotEmpty()
  // @Type(() => CreatorsDto)
  // creators: CreatorsDto[];

  // @IsString()
  // signature: string;
}

export class AttributesDto {
  @IsString()
  @IsOptional()
  trait_type?: string;

  @IsString()
  @IsOptional()
  value?: string;
}

export class CreatorsDto {
  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  share?: number;
}

export type ListingInput = Listing & {
  nft: Nft & {
    owner: Wallet;
  };
};

export async function toListingDto(listing: ListingInput) {
  const response = await axios.get<JsonMetadata>(listing.nft.uri);
  const collectionMetadata: JsonMetadata = response.data;
  const tokenAddress = Pda.find(associatedTokenProgram.address, [
    new PublicKey(listing.nft.owner.address).toBuffer(),
    tokenProgram.address.toBuffer(),
    new PublicKey(listing.nftAddress).toBuffer(),
  ]).toString();

  const usedTrait = collectionMetadata.attributes.find(
    (a) => a.trait_type === USED_TRAIT,
  );
  const signedTrait = collectionMetadata.attributes.find(
    (a) => a.trait_type === SIGNED_TRAIT,
  );

  const plainListingDto: ListingDto = {
    id: listing.id,
    nftAddress: listing.nftAddress,
    name: listing.nft.name,
    cover: collectionMetadata.image,
    seller: {
      address: listing.nft.owner.address,
      avatar: listing.nft.owner.avatar,
      label: listing.nft.owner.label,
    },
    tokenAddress,
    price: listing.price,
    attributes: collectionMetadata.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
    isUsed: isNil(usedTrait) ? undefined : usedTrait.value === 'true',
    isSigned: isNil(signedTrait) ? undefined : signedTrait.value === 'true',
    // description: collectionMetadata.description, // hide this in array?
    // symbol: listing.symbol, // hide this in array?
    // createdAt: listing.createdAt.toISOString(), // hide this in array?
    // royalties: collectionMetadata.seller_fee_basis_points, // hide this in array?
    // collectionName: collectionMetadata.collection.name, // hide this in array?
    // externalUrl: collectionMetadata.external_url, // hide this in array?
    // creators: collectionMetadata.properties.creators, // hide this in array?
    // signature: listing.signature, // hide this in array?
  };
  const listingDto = plainToInstance(ListingDto, plainListingDto);
  return listingDto;
}

export const toListingDtoArray = (listings: ListingInput[]) => {
  return Promise.all(listings.map(toListingDto));
};
