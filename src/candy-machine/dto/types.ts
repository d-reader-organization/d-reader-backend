import {
  CandyMachine,
  DefaultCandyGuardSettings,
  PublicKey,
} from '@metaplex-foundation/js';

export type MintSettings = {
  candyMachine: CandyMachine<DefaultCandyGuardSettings>;
  feePayer: PublicKey;
  mint: PublicKey;
  destinationWallet: PublicKey;
  label?: string;
  nftGateMint?: PublicKey;
};

export type NftFiles = {
  type: string;
  uri: string;
};
