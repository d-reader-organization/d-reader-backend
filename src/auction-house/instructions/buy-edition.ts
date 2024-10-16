import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import {
  createNoopSigner,
  publicKey,
  Umi,
  generateSigner,
} from '@metaplex-foundation/umi';
import { base64 } from '@metaplex-foundation/umi/serializers';
import {
  buyEdition,
  BuyEditionInstructionAccounts,
  BuyEditionInstructionDataArgs,
  findEditionSaleConfigPda,
  findMasterEditionAuthorityPda,
} from 'core-auctions';

export async function createBuyPrintEditionTransaction(
  umi: Umi,
  collectionAddress: string,
  sellerAddress: string,
  buyerAddress: string,
  splTokenAddress: string,
  computePrice?: number,
) {
  const collection = publicKey(collectionAddress);
  const seller = publicKey(sellerAddress);
  const buyer = publicKey(buyerAddress);

  const buyerSigner = createNoopSigner(buyer);
  const edition = generateSigner(umi);
  const editionSaleConfig = findEditionSaleConfigPda(umi, { collection });

  const masterEditionAuthority = findMasterEditionAuthorityPda(umi, {
    collection,
  });
  const currencyMint = publicKey(splTokenAddress);

  let sellerPaymentReciept = seller;
  let paymentAccount = buyer;

  const isNative = splTokenAddress === WRAPPED_SOL_MINT.toString();
  if (!isNative) {
    sellerPaymentReciept = findAssociatedTokenPda(umi, {
      mint: currencyMint,
      owner: seller,
    })[0];

    paymentAccount = findAssociatedTokenPda(umi, {
      mint: currencyMint,
      owner: buyer,
    })[0];
  }

  const buyEditionInstructionData: BuyEditionInstructionAccounts &
    BuyEditionInstructionDataArgs = {
    collection,
    seller,
    buyer: buyerSigner,
    masterEditionAuthority,
    editionSaleConfig,
    edition,
    paymentAccount,
    sellerPaymentReciept: sellerPaymentReciept,
    currencyMint,
  };

  let builder = buyEdition(umi, buyEditionInstructionData);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = await builder.buildAndSign({
    ...umi,
    payer: buyerSigner,
  });

  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];

  return serializedTransaction;
}
