import { addConfigLines } from '@metaplex-foundation/mpl-core-candy-machine';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { PublicKey as UmiPublicKey, Umi } from '@metaplex-foundation/umi';
import { base64 } from '@metaplex-foundation/umi/serializers';

type ItemChunk = {
  uri: string;
  name: string;
};

export async function constructInsertItemsTransaction(
  umi: Umi,
  candyMachine: UmiPublicKey,
  index: number,
  itemsChunk: ItemChunk[],
  computePrice?: number,
) {
  let builder = addConfigLines(umi, {
    index,
    configLines: itemsChunk,
    candyMachine,
  });

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, {
        microLamports: computePrice,
      }),
    );
  }

  const transaction = await builder.buildAndSign(umi);
  const serializedTransaction = base64.deserialize(
    umi.transactions.serialize(transaction),
  )[0];
  return serializedTransaction;
}
