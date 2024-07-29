import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  MetaplexFile,
} from '@metaplex-foundation/js';
import { Cluster, Connection, Keypair, Transaction } from '@solana/web3.js';
import * as AES from 'crypto-js/aes';
import * as Utf8 from 'crypto-js/enc-utf8';
import { BUNDLR_ADDRESS } from '../constants';
import { heliusClusterApiUrl } from 'helius-sdk';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import {
  createSignerFromKeypair,
  keypairIdentity as umiKeypairIdentity,
  Transaction as UmiTransaction,
} from '@metaplex-foundation/umi';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';

export type MetadataFile = {
  type?: string;
  uri?: MetaplexFile | string;
  [key: string]: unknown;
};

const getThirdPartySignerKeypair = () => {
  const thirdPartySigner = AES.decrypt(
    process.env.THIRD_PARTY_SIGNER_PRIVATE_KEY,
    process.env.THIRD_PARTY_SIGNER_SECRET,
  );
  const thirdPartySignerKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(thirdPartySigner.toString(Utf8))),
  );
  return thirdPartySignerKeypair;
};

export const getThirdPartySigner = () => {
  return getThirdPartySignerKeypair().publicKey;
};

export const getThirdPartyLegacySignature = (transaction: Transaction) => {
  const signer = getThirdPartySignerKeypair();
  transaction.partialSign(signer);
  return transaction;
};

export const getThirdPartyUmiSignature = async (
  transaction: UmiTransaction,
) => {
  const thirdPartyKeypair = fromWeb3JsKeypair(getThirdPartySignerKeypair());
  const thirdPartySigner = createSignerFromKeypair(umi, thirdPartyKeypair);
  return thirdPartySigner.signTransaction(transaction);
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
  return getTreasuryKeypair().publicKey;
};

export const getIdentitySignature = (transaction: Transaction) => {
  const signer = getTreasuryKeypair();
  transaction.partialSign(signer);
  return transaction;
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
    .use(irysUploader())
    .use(umiKeypairIdentity(fromWeb3JsKeypair(treasuryKeypair)));

  return umi;
}

export const umi = initUmi();

export function writeFiles(...files: MetaplexFile[]): MetadataFile[] {
  return files.map((file) => ({
    uri: file,
    type: file.contentType,
  }));
}
