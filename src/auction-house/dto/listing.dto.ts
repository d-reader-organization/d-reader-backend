import { Type, plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import {
  Pda,
  associatedTokenProgram,
  tokenProgram,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import {
  fetchOffChainMetadata,
  findRarityTrait,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';
import { NftAttributeDto } from '../../nft/dto/nft.dto';
import { Listing, Wallet, Nft, ComicRarity, User } from '@prisma/client';
import { SellerDto, toSellerDto } from './types/seller.dto';
import { ApiProperty } from '@nestjs/swagger';
import { divide } from 'lodash';

export class ListingDto {
  @IsPositive()
  id: number;

  @IsSolanaAddress()
  nftAddress: string;

  @IsString()
  name: string;

  @IsString()
  cover: string;

  @Type(() => SellerDto)
  seller: SellerDto;

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

  @IsEnum(ComicRarity)
  @ApiProperty({ enum: ComicRarity })
  rarity: ComicRarity;

  @IsNumber()
  royalties: number;

  // @IsString()
  // description: string;

  // @IsString()
  // symbol: string;

  // @IsDateString()
  // createdAt: string;

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
  nft: Nft & { owner: Wallet & { user?: User } };
};

export async function toListingDto(listing: ListingInput) {
  const sellerAddress = new PublicKey(listing.nft.owner.address);
  const [collectionMetadata, seller] = await Promise.all([
    fetchOffChainMetadata(listing.nft.uri),
    toSellerDto(listing.nft.owner),
  ]);
  const tokenAddress = Pda.find(associatedTokenProgram.address, [
    sellerAddress.toBuffer(),
    tokenProgram.address.toBuffer(),
    new PublicKey(listing.nftAddress).toBuffer(),
  ]).toString();

  const plainListingDto: ListingDto = {
    id: listing.id,
    nftAddress: listing.nftAddress,
    name: listing.nft.name,
    cover: collectionMetadata.image,
    seller,
    tokenAddress,
    price: listing.price,
    attributes: collectionMetadata.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
    isUsed: findUsedTrait(collectionMetadata),
    isSigned: findSignedTrait(collectionMetadata),
    rarity: findRarityTrait(collectionMetadata),
    royalties: divide(collectionMetadata.seller_fee_basis_points, 100),
    // description: collectionMetadata.description, // hide this in array?
    // symbol: listing.symbol, // hide this in array?
    // createdAt: listing.createdAt.toISOString(), // hide this in array?
    // collectionName: collectionMetadata.collection.name, // hide this in array?
    // externalUrl: collectionMetadata.external_url, // hide this in array?
    // creators: collectionMetadata.properties.creators, // hide this in array?
    // signature: listing.signature, // hide this in array?
  };
  const listingDto = plainToInstance(ListingDto, plainListingDto);
  return listingDto;
}

export const toListingDtoArray = (listedItems: ListingInput[]) => {
  return Promise.all(listedItems.map(toListingDto));
};
