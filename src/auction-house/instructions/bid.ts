import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { Umi, publicKey, createNoopSigner } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { base64 } from '@metaplex-foundation/umi/serializers';
import {
  buy,
  BuyInstructionAccounts,
  BuyInstructionArgs,
  cancelBid,
  CancelBidInstructionAccounts,
  findAuctionHouseFeePda,
  findBidPda,
  findEscrowPaymentPda,
  findListingConfigPda,
  findListingPda,
} from 'core-auctions';
import { getTreasuryPublicKey } from '../../utils/metaplex';

export async function createBidTransaction(
  umi: Umi,
  auctionHouseAddress: string,
  assetAddress: string,
  bidderAddress: string,
  splTokenAddress: string,
  bidPrice: number,
  isTimedAuction: boolean,
  computePrice?: number,
) {
  const bidder = publicKey(bidderAddress);
  const auctionHouse = publicKey(auctionHouseAddress);
  const wallet = createNoopSigner(bidder);

  const treasuryMint = publicKey(splTokenAddress);
  const asset = publicKey(assetAddress);

  let paymentAccount = bidder;
  const isNative = splTokenAddress === WRAPPED_SOL_MINT.toString();
  if (!isNative) {
    paymentAccount = findAssociatedTokenPda(umi, {
      mint: treasuryMint,
      owner: bidder,
    })[0];
  }

  const escrowPaymentAccount = findEscrowPaymentPda(umi, {
    auctionHouse,
    wallet: bidder,
  });
  const listing = findListingPda(umi, { asset, auctionHouse });
  const bid = findBidPda(umi, { wallet: bidder, auctionHouse, asset });
  const listingConfig = findListingConfigPda(umi, { listing: listing[0] });

  const buyInstructionData: BuyInstructionAccounts & BuyInstructionArgs = {
    wallet,
    auctionHouse,
    paymentAccount,
    escrowPaymentAccount,
    listing,
    listingConfig: isTimedAuction ? listingConfig : undefined,
    transferAuthority: bidder,
    treasuryMint,
    bid,
    bidPrice,
  };

  let builder = buy(umi, buyInstructionData);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = await builder.buildAndSign({
    ...umi,
    payer: wallet,
  });

  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}

export async function createCancelBidTransaction(
  umi: Umi,
  auctionHouseAddress: string,
  assetAddress: string,
  bidderAddress: string,
) {
  const bidder = publicKey(bidderAddress);
  const auctionHouse = publicKey(auctionHouseAddress);
  const wallet = createNoopSigner(bidder);

  const asset = publicKey(assetAddress);
  const auctionHouseFeeAccount = findAuctionHouseFeePda(umi, { auctionHouse });
  const listing = findListingPda(umi, { asset, auctionHouse });
  const bid = findBidPda(umi, { wallet: bidder, auctionHouse, asset });

  const identityPublicKey = fromWeb3JsPublicKey(getTreasuryPublicKey());
  const authority = publicKey(identityPublicKey);

  const cancelBidInstructionData: CancelBidInstructionAccounts = {
    wallet: bidder,
    asset,
    auctionHouse,
    auctionHouseFeeAccount,
    listing,
    bid,
    authority,
  };

  const transaction = await cancelBid(
    umi,
    cancelBidInstructionData,
  ).buildAndSign({ ...umi, payer: wallet });

  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}
