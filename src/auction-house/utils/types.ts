import { Listing, Wallet } from '@prisma/client';

export type ListingReceipt = Listing & {
  nft: {
    name: string;
    owner: Wallet;
  };
};

export type Listings = Listing & {
  nft: {
    name: string;
    uri: string;
    owner: Wallet;
  };
};
