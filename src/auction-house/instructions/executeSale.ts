import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { publicKey, Umi } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { base64 } from '@metaplex-foundation/umi/serializers';
import {
  executeSale,
  ExecuteSaleInstructionAccounts,
  findAuctionHouseAssetVaultPda,
  findAuctionHouseFeePda,
  findAuctionHouseTreasuryPda,
  findBidPda,
  findEscrowPaymentPda,
  findListingConfigPda,
  findListingPda,
} from 'core-auctions';
import { getTreasuryPublicKey } from '../../utils/metaplex';

export async function createExecuteSaleTransaction(
  umi: Umi,
  auctionHouseAddress: string,
  assetAddress: string,
  sellerAddress: string,
  bidderAddress: string,
  splTokenAddress: string,
  isTimedAuction: boolean,
  collectionAddress: string,
  computePrice?: number,
) {
  const seller = publicKey(sellerAddress);
  const buyer = publicKey(bidderAddress);
  const asset = publicKey(assetAddress);

  const auctionHouse = publicKey(auctionHouseAddress);
  const auctionHouseAssetVault = findAuctionHouseAssetVaultPda(umi, {
    auctionHouse,
  });
  const auctionHouseFeeAccount = findAuctionHouseFeePda(umi, { auctionHouse });
  const auctionHouseTreasury = findAuctionHouseTreasuryPda(umi, {
    auctionHouse,
  });

  const listing = findListingPda(umi, { asset, auctionHouse });
  const bid = findBidPda(umi, { asset, auctionHouse, wallet: buyer });
  const identityPublicKey = fromWeb3JsPublicKey(getTreasuryPublicKey());
  const authority = publicKey(identityPublicKey);
  const treasuryMint = publicKey(splTokenAddress);
  const escrowPaymentAccount = findEscrowPaymentPda(umi, {
    auctionHouse,
    wallet: buyer,
  });

  let sellerPaymentReceiptAccount = seller;
  const isNative = splTokenAddress === WRAPPED_SOL_MINT.toString();
  if (!isNative) {
    sellerPaymentReceiptAccount = findAssociatedTokenPda(umi, {
      mint: treasuryMint,
      owner: seller,
    })[0];
  }

  const listingConfig = isTimedAuction
    ? findListingConfigPda(umi, { listing: listing[0] })
    : undefined;
  const executeSaleInstructionData: ExecuteSaleInstructionAccounts = {
    buyer,
    bid,
    treasuryMint,
    seller,
    authority,
    escrowPaymentAccount,
    collection: publicKey(collectionAddress),
    auctionHouse,
    auctionHouseAssetVault,
    auctionHouseFeeAccount,
    auctionHouseTreasury,
    asset,
    listing,
    listingConfig,
    sellerPaymentReceiptAccount,
  };

  let builder = executeSale(umi, executeSaleInstructionData);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = await builder.buildAndSign(umi);
  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}
