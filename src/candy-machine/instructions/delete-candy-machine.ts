import { Metaplex, PublicKey } from '@metaplex-foundation/js';
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { MIN_COMPUTE_PRICE_IX } from '../../constants';
import {
  Umi,
  PublicKey as UmiPublicKey,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import {
  deleteCandyMachine,
  deleteCandyGuard,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { base58 } from '@metaplex-foundation/umi/serializers';

export async function deleteCoreCandyMachine(
  umi: Umi,
  address: UmiPublicKey,
  candyGuard: UmiPublicKey,
) {
  const deleteCandyMachineBuilder = deleteCandyMachine(umi, {
    candyMachine: address,
    authority: umi.identity,
  });
  const deleteCandyGuardBuilder = deleteCandyGuard(umi, {
    candyGuard,
    authority: umi.identity,
  });

  const builder = transactionBuilder()
    .add(deleteCandyMachineBuilder)
    .add(deleteCandyGuardBuilder);
  const response = await builder.sendAndConfirm(umi, {
    send: { commitment: 'confirmed', skipPreflight: true },
  });

  const signature = base58.deserialize(response.signature)[0];
  return signature;
}

export async function deleteLegacyCandyMachine(
  metaplex: Metaplex,
  address: PublicKey,
) {
  const candyMachine = await metaplex
    .candyMachines()
    .findByAddress({ address });

  const deleteCandyMachineBuilder = metaplex
    .candyMachines()
    .builders()
    .delete({ candyMachine: address });

  const deleteCandyGuardBuilder = metaplex
    .candyMachines()
    .builders()
    .deleteCandyGuard({ candyGuard: candyMachine.mintAuthorityAddress });

  const latestBlockhash = await metaplex.connection.getLatestBlockhash({
    commitment: 'confirmed',
  });

  const deleteCandyMachineTransaction =
    deleteCandyMachineBuilder.toTransaction(latestBlockhash);
  const deleteCandyGuardTransaction =
    deleteCandyGuardBuilder.toTransaction(latestBlockhash);

  const transaction = new Transaction({
    feePayer: metaplex.identity().publicKey,
    ...latestBlockhash,
  }).add(
    MIN_COMPUTE_PRICE_IX,
    deleteCandyMachineTransaction,
    deleteCandyGuardTransaction,
  );

  const signature = await sendAndConfirmTransaction(
    metaplex.connection,
    transaction,
    [metaplex.identity()],
    { skipPreflight: true },
  );
  return signature;
}
