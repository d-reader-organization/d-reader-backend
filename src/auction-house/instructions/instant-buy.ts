import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { AccountMeta, createNoopSigner } from '@metaplex-foundation/umi';
import { publicKey, Umi } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { base64 } from '@metaplex-foundation/umi/serializers';
import {
  buy,
  BuyInstructionAccounts,
  BuyInstructionArgs,
  executeSale,
  ExecuteSaleInstructionAccounts,
  findAuctionHouseAssetVaultPda,
  findAuctionHouseFeePda,
  findAuctionHouseTreasuryPda,
  findBidPda,
  findEscrowPaymentPda,
  findListingPda,
} from 'core-auctions';
import { getTreasuryPublicKey } from '../../utils/metaplex';
import { fetchAsset, MPL_CORE_PROGRAM_ID } from '@metaplex-foundation/mpl-core';

export async function createInstantBuyTransaction(
  umi: Umi,
  auctionHouseAddress: string,
  assetAddress: string,
  buyerAddress: string,
  sellerAddress: string,
  splTokenAddress: string,
  bidPrice: number,
  computePrice?: number,
) {
  const buyer = publicKey(buyerAddress);
  const seller = publicKey(sellerAddress);

  const auctionHouse = publicKey(auctionHouseAddress);
  const wallet = createNoopSigner(buyer);

  const treasuryMint = publicKey(splTokenAddress);
  const asset = publicKey(assetAddress);

  let paymentAccount = buyer;
  const isNative = splTokenAddress === WRAPPED_SOL_MINT.toString();

  const escrowPaymentAccount = findEscrowPaymentPda(umi, {
    auctionHouse,
    wallet: buyer,
  });
  const listing = findListingPda(umi, { asset, auctionHouse });
  const bid = findBidPda(umi, { wallet: buyer, auctionHouse, asset });

  const auctionHouseAssetVault = findAuctionHouseAssetVaultPda(umi, {
    auctionHouse,
  });
  const auctionHouseFeeAccount = findAuctionHouseFeePda(umi, { auctionHouse });
  const auctionHouseTreasury = findAuctionHouseTreasuryPda(umi, {
    auctionHouse,
  });

  const identityPublicKey = fromWeb3JsPublicKey(getTreasuryPublicKey());
  const authority = publicKey(identityPublicKey);

  let sellerPaymentReceiptAccount = seller;
  if (!isNative) {
    sellerPaymentReceiptAccount = findAssociatedTokenPda(umi, {
      mint: treasuryMint,
      owner: seller,
    })[0];
    paymentAccount = findAssociatedTokenPda(umi, {
      mint: treasuryMint,
      owner: buyer,
    })[0];
  }

  const buyInstructionData: BuyInstructionAccounts & BuyInstructionArgs = {
    wallet,
    auctionHouse,
    asset,
    paymentAccount,
    escrowPaymentAccount,
    listing,
    transferAuthority: buyer,
    treasuryMint,
    bid,
    bidPrice,
  };

  const assetData = await fetchAsset(umi, assetAddress);
  const remainingAccounts: AccountMeta[] = assetData.royalties.creators.map(
    (creator) => ({
      pubkey: creator.address,
      isSigner: false,
      isWritable: false,
    }),
  );

  const executeSaleInstructionData: ExecuteSaleInstructionAccounts = {
    buyer,
    bid,
    treasuryMint,
    seller,
    authority,
    escrowPaymentAccount,
    auctionHouse,
    auctionHouseAssetVault,
    auctionHouseFeeAccount,
    auctionHouseTreasury,
    asset,
    listing,
    sellerPaymentReceiptAccount,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
  };

  const executeSaleBuilder = executeSale(
    umi,
    executeSaleInstructionData,
  ).addRemainingAccounts(remainingAccounts);
  let builder = buy(umi, buyInstructionData).add(executeSaleBuilder);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = await builder.buildAndSign({ ...umi, payer: wallet });

  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}
