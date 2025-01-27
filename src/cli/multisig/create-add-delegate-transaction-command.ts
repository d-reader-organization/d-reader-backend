import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from '../chalk';
import { umi } from '../../utils/metaplex';
import {
  createNoopSigner,
  publicKey,
  PublicKey,
} from '@metaplex-foundation/umi';
import {
  fetchCollection,
  updateCollectionPlugin,
} from '@metaplex-foundation/mpl-core';
import { COLLECTION_MANAGER_MULTISIG } from '../../constants';
import { isEqual } from 'lodash';
import { BadRequestException } from '@nestjs/common';
import { base58, base64 } from '@metaplex-foundation/umi/serializers';

interface Options {
  collectionAddress: PublicKey;
  delegate: PublicKey;
}

@Command({
  name: 'create-add-delegate-transaction',
  description: 'Create add delegate transaction to be used in multisig',
})
export class CreateAddDelegateTransactionCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask(
      'create-add-delegate-transaction',
      options,
    );
    await this.createAddDelegateTransactionCommand(options);
  }

  async createAddDelegateTransactionCommand(options: Options) {
    log("🏗️  Starting 'create-add-delegate-transaction' command...");

    try {
      const { delegate, collectionAddress } = options;

      const collection = await fetchCollection(umi, collectionAddress);
      if (
        collection.updateDelegate.additionalDelegates.some((value) =>
          isEqual(value, delegate),
        )
      ) {
        throw new BadRequestException(
          `Delegate ${delegate.toString()} already exists for collection : ${collectionAddress.toString()}`,
        );
      }

      const multisig = publicKey(COLLECTION_MANAGER_MULTISIG);
      const authority = createNoopSigner(multisig);

      const transaction = await updateCollectionPlugin(umi, {
        authority,
        collection: collectionAddress,
        payer: authority,
        plugin: {
          type: 'UpdateDelegate',
          additionalDelegates: [
            ...collection.updateDelegate.additionalDelegates,
            delegate,
          ],
        },
      }).buildAndSign({ ...umi, payer: authority });

      const transactionBuffer = umi.transactions.serialize(transaction);
      const base64Transaction = base64.deserialize(transactionBuffer)[0];
      const base58Transaction = base58.deserialize(transactionBuffer)[0];

      log('\n⚠️ Transactions: ');

      log('\n ----------------------------------------------------');
      log('\n Transaction to be input in multisig: ', base58Transaction);

      log('\n ----------------------------------------------------------');
      log(
        '\n Transaction to be input in solana inspector: ',
        base64Transaction,
      );
    } catch (e) {
      logErr(`Failed to create transaction: ${e}`);
    }
  }
}
