import { Type, plainToInstance } from 'class-transformer';
import { IsDate, IsInt, IsPositive, IsString } from 'class-validator';
import { Listing, User } from '@prisma/client';
import {
  CollectibleComicDto,
  CollectibleComicInput,
  toCollectibleComicDto,
} from '../../digital-asset/dto/collectible-comic.dto';
import { SOL_ADDRESS } from '../../constants';
import { IsSolanaAddress } from '../../decorators/IsSolanaAddress';
import { BasicUserDto, toBasicUserDto } from '../../user/dto/basic-user-dto';
import { ifDefined } from '../../utils/lodash';

export class ListingDto {
  @IsPositive()
  id: number;

  @Type(() => CollectibleComicDto)
  collectibleComic: CollectibleComicDto;

  @Type(() => BasicUserDto)
  seller?: BasicUserDto;

  @IsSolanaAddress()
  sellerAddress: string;

  @IsString()
  splTokenAddress: string;

  @IsInt()
  price: number;

  @IsDate()
  createdAt: Date;
}

export type ListingInput = Listing & {
  collectibleComic: CollectibleComicInput;
  seller?: User;
};

export function toListingDto(listing: ListingInput) {
  const sellerAddress = listing.sellerAddress;

  const plainListingDto: ListingDto = {
    id: listing.id,
    collectibleComic: toCollectibleComicDto(listing.collectibleComic),
    seller: ifDefined(listing.seller, toBasicUserDto),
    sellerAddress,
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
