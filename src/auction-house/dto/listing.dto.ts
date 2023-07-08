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
  Pda,
  associatedTokenProgram,
  tokenProgram,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import {
  fetchOffChainMetadata,
  findSignedTrait,
  findUsedTrait,
} from '../../utils/nft-metadata';
import { NftAttributeDto } from '../../nft/dto/nft.dto';
import { Listing, Wallet, Nft } from '@prisma/client';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { WalletDto } from 'src/wallet/dto/wallet.dto';

export class PartialWalletDto extends PickType(WalletDto, [
  'address',
  'avatar',
  'name',
]) {}

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

  @Type(() => PartialWalletDto)
  seller: PartialWalletDto;

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
  const collectionMetadata = await fetchOffChainMetadata(listing.nft.uri);
  const tokenAddress = Pda.find(associatedTokenProgram.address, [
    new PublicKey(listing.nft.owner.address).toBuffer(),
    tokenProgram.address.toBuffer(),
    new PublicKey(listing.nftAddress).toBuffer(),
  ]).toString();

  const plainListingDto: ListingDto = {
    id: listing.id,
    nftAddress: listing.nftAddress,
    name: listing.nft.name,
    cover: collectionMetadata.image,
    seller: {
      address: listing.nft.owner.address,
      avatar: listing.nft.owner.avatar,
      name: listing.nft.owner.name,
    },
    tokenAddress,
    price: listing.price,
    attributes: collectionMetadata.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
    isUsed: findUsedTrait(collectionMetadata),
    isSigned: findSignedTrait(collectionMetadata),
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
