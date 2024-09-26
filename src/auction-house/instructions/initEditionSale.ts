import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { createNoopSigner, publicKey, Umi } from '@metaplex-foundation/umi';
import { base64 } from '@metaplex-foundation/umi/serializers';
import {
  findEditionSaleConfigPda,
  findMasterEditionAuthorityPda,
  initEditionSale,
  InitEditionSaleInstructionAccounts,
  InitEditionSaleInstructionArgs,
} from 'core-auctions';

export async function createInitEditionSaleTransaction(
  umi: Umi,
  sellerAddress: string,
  collectionAddress: string,
  splTokenAddress: string,
  price: number,
  startDate: Date,
  endDate: Date,
  computePrice?: number,
) {
  const seller = publicKey(sellerAddress);
  const collection = publicKey(collectionAddress);
  const sellerAsSigner = createNoopSigner(seller);

  const editionSaleConfig = findEditionSaleConfigPda(umi, { collection });
  const masterEditionAuthority = findMasterEditionAuthorityPda(umi, {
    collection,
  });
  const currencyMint = publicKey(splTokenAddress);

  const initEditionSaleInstructionData: InitEditionSaleInstructionAccounts &
    InitEditionSaleInstructionArgs = {
    seller: sellerAsSigner,
    collection,
    editionSaleConfig,
    currencyMint,
    masterEditionAuthority,
    price,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  };

  let builder = initEditionSale(umi, initEditionSaleInstructionData);

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
