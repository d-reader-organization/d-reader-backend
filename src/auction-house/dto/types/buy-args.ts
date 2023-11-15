import { PublicKey } from '@solana/web3.js';

export type BuyArgs = {
  buyer: PublicKey;
  mintAccount: PublicKey;
  price: number;
  seller: PublicKey;
};
