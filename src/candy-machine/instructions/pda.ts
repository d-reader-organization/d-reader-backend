import { PublicKey } from '@metaplex-foundation/js';

export const PUB_AUTH_TAG = 'publishing_authority';
export const AUTH_TAG = 'comic_authority_';

export function pda(seeds: (Buffer | Uint8Array)[], programId: PublicKey) {
  const [pdaKey] = PublicKey.findProgramAddressSync(seeds, programId);
  return pdaKey;
}
