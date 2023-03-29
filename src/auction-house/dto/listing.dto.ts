import axios from 'axios';
import { Type, plainToInstance } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { IsSolanaAddress } from 'src/decorators/IsSolanaAddress';
import {
  JsonMetadata,
  Pda,
  associatedTokenProgram,
  tokenProgram,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { Listings } from './types';

export class ListingDto {
  @IsPositive()
  id: number;

  @IsSolanaAddress()
  @IsString()
  nftAddress: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  cover: string;

  @IsSolanaAddress()
  @IsString()
  sellerAddress: string;

  @IsString()
  tokenAddress: string;

  @IsNumber()
  price: number;

  @IsString()
  symbol: string;

  @IsDateString()
  createdAt: string;

  @IsNumber()
  royalties: number;

  @IsString()
  collectionName: string;

  @IsString()
  externalUrl: string;

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => AttributesDto)
  attributes: AttributesDto[];

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => CreatorsDto)
  creators: CreatorsDto[];

  @IsString()
  signature: string;

  @IsOptional()
  @IsDateString()
  canceledAt?: string;
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

export async function toListingDto(listing: Listings) {
  const response = await axios.get(listing.nft.uri);
  const collectionMetadata: JsonMetadata = response.data;
  const tokenAddress = Pda.find(associatedTokenProgram.address, [
    new PublicKey(listing.nft.owner.address).toBuffer(),
    tokenProgram.address.toBuffer(),
    new PublicKey(listing.nftAddress).toBuffer(),
  ]).toString();

  const plainListingDto: ListingDto = {
    id: listing.id,
    nftAddress: listing.nftAddress,
    name: listing.nft.name,
    description: collectionMetadata.description, // hide this in array?
    cover: collectionMetadata.image,
    // sellerAddress: listing.nft.owner.address,
    seller: {
      address: listing.nft.owner.address,
      avatar: listing.nft.owner.avatar,
      label: listing.nft.owner.label,
    }
    tokenAddress,
    price: listing.price,
    symbol: listing.symbol, // hide this in array?
    createdAt: listing.createdAt.toISOString(), // hide this in array?
    royalties: collectionMetadata.seller_fee_basis_points, // hide this in array?
    collectionName: collectionMetadata.collection.name, // hide this in array?
    externalUrl: collectionMetadata.external_url, // hide this in array?
    attributes: collectionMetadata.attributes,
    creators: collectionMetadata.properties.creators, // hide this in array?
    signature: listing.signature, // hide this in array?
    canceledAt:
      listing.canceledAt.toISOString() != new Date(0).toISOString() // hide this in array?
        ? listing.canceledAt.toISOString() // hide this in array?
        : null, // hide this in array?
  };
  const listingDto = plainToInstance(ListingDto, plainListingDto);
  return listingDto;
}

// TODO: array should only return scoped data
export const toListingDtoArray = (listings: Listings[]) => {
  return Promise.all(listings.map(toListingDto));
};
