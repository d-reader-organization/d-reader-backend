import { Transaction } from '@solana/web3.js';
import { umi } from './metaplex';

export const decodeBs58 = (encodedString: string) => {
  return new TextEncoder().encode(encodedString);
};

export const decodeBs64 = (encodedString: string) => {
  return Buffer.from(encodedString, 'base64');
};

export type SupportedEncoding = 'base58' | 'base64';
export const decodeTransaction = (
  encodedTransaction: string,
  encoding: SupportedEncoding = 'base64',
) => {
  if (encoding === 'base58') {
    return Transaction.from(decodeBs58(encodedTransaction));
  } else if (encoding === 'base64') {
    return Transaction.from(decodeBs64(encodedTransaction));
  } else {
    throw new Error('Unsupported encoding format, base58 and base64 supported');
  }
};

export const decodeUmiTransaction = (
  encodedTransaction: string,
  encoding: SupportedEncoding = 'base64',
) => {
  if (encoding === 'base58') {
    return umi.transactions.deserialize(decodeBs58(encodedTransaction));
  } else if (encoding === 'base64') {
    return umi.transactions.deserialize(decodeBs64(encodedTransaction));
  } else {
    throw new Error('Unsupported encoding format, base58 and base64 supported');
  }
};
