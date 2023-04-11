import { Keypair, PublicKey } from '@solana/web3.js';

export type candyMachineCreateObject = {
  candyMachine: {
    key: Keypair;
    authority: PublicKey;
  };
  collection: {
    updateAuthority: PublicKey;
    mint: PublicKey;
  };
  payer?: Keypair;
};
