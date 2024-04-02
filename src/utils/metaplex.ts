import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { Cluster, Connection, Keypair } from '@solana/web3.js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { BUNDLR_ADDRESS } from '../constants';
import { heliusClusterApiUrl } from 'helius-sdk';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { keypairIdentity as umiKeypairIdentity } from '@metaplex-foundation/umi';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';

export type MetdataFile = {
  type?: string;
  uri?: MetaplexFile | string;
  [key: string]: unknown;
};

const getTreasuryKeypair = () => {
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

export function getConnection(customEndpoint?: string) {
  const endpoint =
    customEndpoint ||
    heliusClusterApiUrl(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );
  const connection = new Connection(endpoint, 'confirmed');
  return connection;
}

export function initMetaplex(customEndpoint?: string) {
  const connection = getConnection(customEndpoint);
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

export const metaplex = initMetaplex();

export function initUmi(customEndpoint?: string) {
  const connection = getConnection(customEndpoint);
  const treasuryKeypair = getTreasuryKeypair();
  const umi = createUmi(connection.rpcEndpoint, { commitment: 'confirmed' })
    .use(mplTokenMetadata())
    .use(mplCore())
    .use(mplCandyMachine())
    .use(umiKeypairIdentity(fromWeb3JsKeypair(treasuryKeypair)));

  return umi;
}

export const umi = initUmi();

export function writeFiles(...files: MetaplexFile[]): MetdataFile[] {
  return files.map((file) => ({
    uri: file,
    type: file.contentType,
  }));
}
