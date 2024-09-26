import { MPL_CORE_PROGRAM_ID } from '@metaplex-foundation/mpl-core';
import { Umi, publicKey, createNoopSigner } from '@metaplex-foundation/umi';
import {
  cancelListing,
  CancelListingInstructionAccounts,
  findAuctionHouseAssetVaultPda,
  findAuctionHouseFeePda,
  findListingConfigPda,
  findListingPda,
  sell,
  SellInstructionAccounts,
  SellInstructionArgs,
  timedAuctionSell,
  TimedAuctionSellInstructionAccounts,
  TimedAuctionSellInstructionArgs,
} from 'core-auctions';
import { getTreasuryPublicKey } from '../../utils/metaplex';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { ListingConfigData } from '../dto/types/listing-config-data';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';

export async function createSellTransaction(
  umi: Umi,
  assetAddress: string,
  sellerAddress: string,
  auctionHouseAddress: string,
  price: number,
  collectionAddress?: string,
  computePrice?: number,
) {
  const seller = publicKey(sellerAddress);
  const sellerSigner = createNoopSigner(seller);
  const asset = publicKey(assetAddress);

  const auctionHouse = publicKey(auctionHouseAddress);
  const auctionHouseAssetVault = findAuctionHouseAssetVaultPda(umi, {
    auctionHouse,
  });
  const auctionHouseFeeAccount = findAuctionHouseFeePda(umi, { auctionHouse });

  const listing = findListingPda(umi, { asset, auctionHouse });
  const identityPublicKey = fromWeb3JsPublicKey(getTreasuryPublicKey());
  const authority = publicKey(identityPublicKey);
  const collection = collectionAddress
    ? publicKey(collectionAddress)
    : undefined;

  const sellInstructionData: SellInstructionAccounts & SellInstructionArgs = {
    asset,
    auctionHouse,
    auctionHouseAssetVault,
    auctionHouseFeeAccount,
    wallet: sellerSigner,
    listing,
    authority,
    collection,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    price,
  };

  let builder = sell(umi, sellInstructionData);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = await builder.buildAndSign({
    ...umi,
    payer: sellerSigner,
  });

  const serializeTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializeTransaction;
}

export async function createTimedAuctionSellTransaction(
  umi: Umi,
  assetAddress: string,
  sellerAddress: string,
  auctionHouseAddress: string,
  listingConfigData: ListingConfigData,
  collectionAddress?: string,
) {
  const seller = publicKey(sellerAddress);
  const sellerSigner = createNoopSigner(seller);
  const asset = publicKey(assetAddress);

  const auctionHouse = publicKey(auctionHouseAddress);
  const auctionHouseAssetVault = findAuctionHouseAssetVaultPda(umi, {
    auctionHouse,
  });
  const auctionHouseFeeAccount = findAuctionHouseFeePda(umi, { auctionHouse });

  const listing = findListingPda(umi, { asset, auctionHouse });
  const listingConfig = findListingConfigPda(umi, { listing: listing[0] });
  const identityPublicKey = fromWeb3JsPublicKey(getTreasuryPublicKey());

  const authority = publicKey(identityPublicKey);
  const collection = collectionAddress
    ? publicKey(collectionAddress)
    : undefined;

  const {
    startDate,
    endDate,
    reservePrice,
    minBidIncrement,
    allowHighBidCancel,
  } = listingConfigData;

  const timedAuctionSellInstructionData: TimedAuctionSellInstructionAccounts &
    TimedAuctionSellInstructionArgs = {
    asset,
    auctionHouse,
    auctionHouseAssetVault,
    auctionHouseFeeAccount,
    wallet: sellerSigner,
    listing,
    listingConfig,
    authority,
    collection,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    allowHighBidCancel,
    minBidIncrement,
    reservePrice,
  };

  const transaction = await timedAuctionSell(
    umi,
    timedAuctionSellInstructionData,
  ).buildAndSign({ ...umi, payer: sellerSigner });
  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}

export async function createCancelListingTransaction(
  umi: Umi,
  auctionHouseAddress: string,
  assetAddress: string,
  sellerAddress: string,
) {
  const seller = publicKey(sellerAddress);
  const asset = publicKey(assetAddress);

  const auctionHouse = publicKey(auctionHouseAddress);
  const auctionHouseAssetVault = findAuctionHouseAssetVaultPda(umi, {
    auctionHouse,
  });
  const auctionHouseFeeAccount = findAuctionHouseFeePda(umi, { auctionHouse });

  const listing = findListingPda(umi, { asset, auctionHouse });
  const identityPublicKey = fromWeb3JsPublicKey(getTreasuryPublicKey());
  const authority = publicKey(identityPublicKey);

  const cancelListInstructionData: CancelListingInstructionAccounts = {
    auctionHouse,
    authority,
    wallet: seller,
    listing,
    asset,
    auctionHouseFeeAccount,
    auctionHouseAssetVault,
  };

  const transaction = await cancelListing(
    umi,
    cancelListInstructionData,
  ).buildAndSign(umi);
  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}
