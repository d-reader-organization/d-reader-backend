import { Metaplex, PublicKey } from '@metaplex-foundation/js';
export const AUCTION_HOUSE = 'auction_house';

export const getAuctionHouseProgramAsSigner = (
  metaplex: Metaplex,
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(AUCTION_HOUSE), Buffer.from('signer')],
    metaplex.programs().getAuctionHouse().address,
  )[0];
};
