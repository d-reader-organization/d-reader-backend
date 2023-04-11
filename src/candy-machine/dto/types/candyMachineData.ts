import { CandyMachine } from '@metaplex-foundation/js';

export type CandyMachineCreateData = Pick<
  CandyMachine,
  | 'itemsAvailable'
  | 'symbol'
  | 'sellerFeeBasisPoints'
  | 'maxEditionSupply'
  | 'isMutable'
  | 'creators'
  | 'itemSettings'
>;
