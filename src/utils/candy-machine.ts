import {
  Metaplex,
  CreateCandyMachineInput,
  CandyMachineItem,
  toBigNumber,
  isSigner,
} from '@metaplex-foundation/js';
import { createCollectionNft } from './metaplex';

export const createCandyMachine = async (
  metaplex: Metaplex,
  input?: Partial<CreateCandyMachineInput> & {
    items?: Pick<CandyMachineItem, 'name' | 'uri'>[];
  },
) => {
  let collection;
  if (input?.collection) {
    collection = input.collection;
  } else {
    const nft = await createCollectionNft(metaplex);
    collection = { address: nft.address, updateAuthority: metaplex.identity() };
  }

  let { candyMachine } = await metaplex.candyMachines().create({
    collection,
    sellerFeeBasisPoints: 200,
    itemsAvailable: toBigNumber(1000),
    ...input,
  });

  if (input?.items) {
    await metaplex.candyMachines().insertItems({
      candyMachine,
      authority:
        input.authority && isSigner(input.authority)
          ? input.authority
          : metaplex.identity(),
      items: input.items,
    });
    candyMachine = await metaplex.candyMachines().refresh(candyMachine);
  }

  return { candyMachine, collection };
};
