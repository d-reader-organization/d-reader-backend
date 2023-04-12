import { PublicKey } from '@solana/web3.js';

export type candyMachineCreateObject = {
  candyMachine: {
    address: PublicKey;
    authority: PublicKey;
  };
  collection: {
    updateAuthority: PublicKey;
    mint: PublicKey;
  };
  payer: PublicKey;
};
