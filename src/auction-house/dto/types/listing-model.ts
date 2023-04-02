import {
  Pda,
  Creator,
  SolAmount,
  SplTokenAmount,
  AuctionHouse,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';

export type ListingModel = {
  asset: {
    token: {
      address: Pda;
    };
    address: PublicKey;
    creators: Creator[];
    metadataAddress: Pda;
  };
  sellerAddress: PublicKey;
  tradeStateAddress: Pda;
  price: SolAmount;
  tokens: SplTokenAmount;
  auctionHouse: AuctionHouse;
};
