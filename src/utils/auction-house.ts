import {
  Metaplex,
  CreateAuctionHouseInput,
  OperationOptions,
  sol,
} from '@metaplex-foundation/js';
import { Signer } from '@solana/web3.js';

export const createAuctionHouse = async (
  mx: Metaplex,
  auctioneerAuthority?: Signer | null,
  input: Partial<CreateAuctionHouseInput> = {},
  options: OperationOptions = {},
) => {
  const { auctionHouse } = await mx.auctionHouse().create(
    {
      sellerFeeBasisPoints: 200,
      auctioneerAuthority: auctioneerAuthority?.publicKey,
      ...input,
    },
    options,
  );

  await mx.rpc().airdrop(auctionHouse.feeAccountAddress, sol(2));

  return auctionHouse;
};
