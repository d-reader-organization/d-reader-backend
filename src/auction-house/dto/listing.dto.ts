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
import { JsonMetadata, Metaplex } from '@metaplex-foundation/js';
import { heliusClusterApiUrl } from 'helius-sdk';
import { Cluster, Connection, PublicKey } from '@solana/web3.js';
import { Listings } from '../utils/types';

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

  const endpoint = heliusClusterApiUrl(
    process.env.HELIUS_API_KEY,
    process.env.SOLANA_CLUSTER as Cluster,
  );
  const connection = new Connection(endpoint, 'confirmed');
  const metaplex = new Metaplex(connection);
  const tokenAddress = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({
      mint: new PublicKey(listing.nftAddress),
      owner: new PublicKey(listing.nft.owner.address),
    })
    .toString();

  const plainListingDto: ListingDto = {
    id: listing.id,
    nftAddress: listing.nftAddress,
    name: listing.nft.name,
    description: collectionMetadata.description,
    cover: collectionMetadata.image,
    sellerAddress: listing.nft.owner.address,
    tokenAddress,
    price: listing.price,
    symbol: listing.symbol,
    createdAt: listing.createdAt.toISOString(),
    royalties: collectionMetadata.seller_fee_basis_points,
    collectionName: collectionMetadata.collection.name,
    externalUrl: collectionMetadata.external_url,
    attributes: collectionMetadata.attributes,
    creators: collectionMetadata.properties.creators,
    signature: listing.signature,
    canceledAt: listing.canceledAt?.toISOString(), // TODO: ignore Date(0) values
  };
  const listingDto = plainToInstance(ListingDto, plainListingDto);
  return listingDto;
}

export const toListingDtoArray = (listings: Listings[]) => {
  return Promise.all(listings.map(toListingDto));
};
