import { Listing, Wallet } from '@prisma/client';

export type ListingReceipt = Listing & {
  nft: {
    name: string;
    ownerAddress: string;
    uri?: string;
  };
};

export type Listings = Listing & {
  nft: {
    name: string;
    uri: string;
    owner: Wallet;
  };
};

export type CollectionStats = {
  totalVolume: number;
  itemsListed: number;
  floorPrice: number;
};
