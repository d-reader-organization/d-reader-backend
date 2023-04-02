import {
  Pda,
  SolAmount,
  SplTokenAmount,
  AuctionHouse,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';

export type BidModel = {
  asset: {
    token: {
      address: Pda;
    };
    address: PublicKey;
  };
  buyerAddress: PublicKey;
  tradeStateAddress: Pda;
  price: SolAmount;
  tokens: SplTokenAmount;
  auctionHouse: AuctionHouse;
};
