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
  updateCollectionV1,
} from '@metaplex-foundation/mpl-core';
import { COLLECTION_MANAGER_MULTISIG } from '../../constants';
import { isEqual } from 'lodash';
import { BadRequestException } from '@nestjs/common';
import { base58, base64 } from '@metaplex-foundation/umi/serializers';

interface Options {
  collectionAddress: PublicKey;
  newUpdateAuthority: PublicKey;
}

@Command({
  name: 'create-transfer-authority-transaction',
  description:
    'Create transfer authority from multisig to given address for the collection',
})
export class CreateTransferAuthorityTransactionCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask(
      'create-transfer-authority-transaction',
      options,
    );
    await this.createTransferAuthorityTransaction(options);
  }

  async createTransferAuthorityTransaction(options: Options) {
    log("🏗️  Starting 'create-transfer-authority-transaction' command...");

    try {
      const { collectionAddress, newUpdateAuthority } = options;
      const collection = await fetchCollection(umi, collectionAddress);

      if (isEqual(collection.updateAuthority, newUpdateAuthority)) {
        throw new BadRequestException(
          `Collection ${collectionAddress.toString()} authority is already assigned to give new update authority: ${newUpdateAuthority.toString()}`,
        );
      }

      const multisig = publicKey(COLLECTION_MANAGER_MULTISIG);
      const authority = createNoopSigner(multisig);

      const transaction = await updateCollectionV1(umi, {
        newUpdateAuthority,
        payer: authority,
        collection: collectionAddress,
        authority: createNoopSigner(multisig),
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
      logErr(`Failed: ${e}`);
    }
  }
}
