import { BadRequestException } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';

export const validateEd25519Address = (address: string) => {
  try {
    const isValidAddress = PublicKey.isOnCurve(address);
    if (isValidAddress) return true;
    else throw new Error();
  } catch (error) {
    throw new BadRequestException('Invalid ed25519 wallet address');
  }
};
