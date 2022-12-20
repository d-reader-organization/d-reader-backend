import { Keypair } from '@solana/web3.js';
import * as CryptoJS from 'crypto-js';
// import * as crypto from 'crypto';

export const encryptAES = (message: string, key: string) => {
  return CryptoJS.AES.encrypt(message, key).toString();
};

// export const generateSecret = (size: number) => {
//   return crypto
//     .randomBytes(size / 2)
//     .toString('hex')
//     .toUpperCase();
// };

export const generateSecret = (size: number) => {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let secret = '';
  for (let i = 0; i <= size; i++) {
    const rand = Math.floor(Math.random() * chars.length);
    secret += chars.substring(rand, rand + 1);
  }

  return secret;
};

export const createWallet = () => {
  const secret = generateSecret(64);
  const keypair = Keypair.generate();
  const encryptedPrivateKey = encryptAES(keypair.secretKey.toString(), secret);
  const address = keypair.publicKey.toBase58();

  return { address, secret, keypair, encryptedPrivateKey };
};
