import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
} from '@metaplex-foundation/js';
import { Cluster, Connection, Keypair } from '@solana/web3.js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { heliusClusterApiUrl } from 'helius-sdk';
import { BUNDLR_ADDRESS } from '../constants';

const getTreasuryKeypair = () => {
  console.log({
    TREASURY_PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY,
    TREASURY_SECRET: process.env.TREASURY_SECRET,
  });
  const treasuryWallet = AES.decrypt(
    process.env.TREASURY_PRIVATE_KEY,
    process.env.TREASURY_SECRET,
  );
  const treasuryKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(treasuryWallet.toString(Utf8))),
  );
  return treasuryKeypair;
};

export const getTreasuryPublicKey = () => {
  return getTreasuryKeypair().publicKey.toBase58();
};

// calling this function initializes a new Metaplex instance
// to consider: should we create a shared metaplexService so
// there is only ever a single instance of Metaplex running
export function initMetaplex(customEndpoint?: string) {
  const endpoint =
    customEndpoint ||
    heliusClusterApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
  const connection = new Connection(endpoint, 'confirmed');
  const treasuryKeypair = getTreasuryKeypair();
  const metaplex = new Metaplex(connection)
    .use(keypairIdentity(treasuryKeypair))
    .use(
      bundlrStorage({
        address: BUNDLR_ADDRESS,
        timeout: 60000,
      }),
    );

  return metaplex;
}
