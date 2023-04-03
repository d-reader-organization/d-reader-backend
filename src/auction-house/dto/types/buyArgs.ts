import { PublicKey } from "@solana/web3.js";

export type BuyArgs = {
    mintAccount: PublicKey,
    price: number,
    seller?: PublicKey,
    tokenAccount?: PublicKey,
}