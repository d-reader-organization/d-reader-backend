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
import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../user/dto/user.dto';
import { getPublicUrl } from '../../aws/s3client';
import { WalletDto } from '../../wallet/dto/wallet.dto';

export class SellerDto {
  id?: UserDto['id'];
  avatar?: UserDto['avatar'];
  name?: UserDto['name'];
  address: WalletDto['address'];
}

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
  nft: Nft & { owner: Wallet & { user?: User } };
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
      id: listing.nft.owner.user?.id,
      avatar: getPublicUrl(listing.nft.owner.user?.avatar),
      name: listing.nft.owner.user?.name,
      address: listing.nft.owner.address,
    },
    tokenAddress,
    price: listing.price,
    attributes: collectionMetadata.attributes.map((a) => ({
      trait: a.trait_type,
      value: a.value,
    })),
    isUsed: findUsedTrait(collectionMetadata),
    isSigned: findSignedTrait(collectionMetadata),
    rarity: findRarityTrait(collectionMetadata),
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

export const toListingDtoArray = (listedItems: ListingInput[]) => {
  return Promise.all(listedItems.map(toListingDto));
};
