import { Type, plainToInstance } from 'class-transformer';
import { IsDate, IsInt, IsPositive, IsString } from 'class-validator';
import { Listing } from '@prisma/client';
import { SellerDto, toSellerDto } from './types/seller.dto';
import {
  CollectibleComicDto,
  CollectibleComicInput,
  toCollectibleComicDto,
} from 'src/digital-asset/dto/collectibleComic.dto';
import { SOL_ADDRESS } from 'src/constants';

export class ListingDto {
  @IsPositive()
  id: number;

  @Type(() => CollectibleComicDto)
  collectibleComic: CollectibleComicDto;

  @Type(() => SellerDto)
  seller: SellerDto;

  @IsString()
  splTokenAddress: string;

  @IsInt()
  price: number;

  @IsDate()
  createdAt: Date;
}

export type ListingInput = Listing & {
  collectibleComic: CollectibleComicInput;
};

export async function toListingDto(listing: ListingInput) {
  const sellerAddress = listing.sellerAddress;
  const seller = await toSellerDto({ address: sellerAddress });

  const plainListingDto: ListingDto = {
    id: listing.id,
    collectibleComic: await toCollectibleComicDto(listing.collectibleComic),
    seller,
    price: Number(listing.price),
    splTokenAddress: SOL_ADDRESS, // TODO: replace this with auctionHouse.splTokenAddress
    createdAt: listing.createdAt,
  };

  const listingDto = plainToInstance(ListingDto, plainListingDto);
  return listingDto;
}

export const toListingDtoArray = (listedItems: ListingInput[]) => {
  return Promise.all(listedItems.map(toListingDto));
};
