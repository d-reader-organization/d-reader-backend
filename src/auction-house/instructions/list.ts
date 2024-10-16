import { MPL_CORE_PROGRAM_ID } from '@metaplex-foundation/mpl-core';
import { Umi, publicKey, createNoopSigner } from '@metaplex-foundation/umi';
import {
  cancelListing,
  CancelListingInstructionAccounts,
  findAuctionHouseAssetVaultPda,
  findAuctionHouseFeePda,
  findListingConfigPda,
  findListingPda,
  reprice,
  RepriceInstructionAccounts,
  RepriceInstructionDataArgs,
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
import { getUnixTimestamp } from '../../utils/helpers';

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
    startDate: getUnixTimestamp(startDate),
    endDate: getUnixTimestamp(endDate),
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
  computePrice?: number,
) {
  const seller = publicKey(sellerAddress);
  const asset = publicKey(assetAddress);
  const signer = createNoopSigner(seller);

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
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
  };

  let builder = cancelListing(umi, cancelListInstructionData);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = await builder.buildAndSign({ ...umi, payer: signer });
  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}

export async function createRepirceListingTransaction(
  umi: Umi,
  auctionHouseAddress: string,
  assetAddress: string,
  sellerAddress: string,
  price: number,
  computePrice?: number,
) {
  const seller = publicKey(sellerAddress);
  const asset = publicKey(assetAddress);
  const signer = createNoopSigner(seller);

  const auctionHouse = publicKey(auctionHouseAddress);
  const listing = findListingPda(umi, { asset, auctionHouse });

  const identityPublicKey = fromWeb3JsPublicKey(getTreasuryPublicKey());
  const authority = publicKey(identityPublicKey);

  const repriceListingInstructionData: RepriceInstructionAccounts &
    RepriceInstructionDataArgs = {
    asset,
    auctionHouse,
    authority,
    wallet: seller,
    listing,
    price,
  };

  let builder = reprice(umi, repriceListingInstructionData);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = await builder.buildAndSign({ ...umi, payer: signer });
  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}
