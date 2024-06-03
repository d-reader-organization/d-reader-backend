import { Listing } from '@metaplex-foundation/js';

/** This type is Partial from Metaplex's Listing model
 * We use it when Metaplex does not return a Listing response so we
 * want to rely on our own (custom) logic to create a Listing object
 */
export type PartialListing = {
  asset: {
    token: {
      address: Listing['asset']['token']['address'];
    };
    address: Listing['asset']['address'];
    creators: Listing['asset']['creators'];
    metadataAddress: Listing['asset']['metadataAddress'];
  };
  sellerAddress: Listing['sellerAddress'];
  tradeStateAddress: Listing['tradeStateAddress'];
  price: Listing['price'];
  tokens: Listing['tokens'];
  auctionHouse: Listing['auctionHouse'];
  receiptAddress?: Listing['receiptAddress'];
};
