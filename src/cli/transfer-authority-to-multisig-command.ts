import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { getTreasuryUmiPublicKey, umi } from '../utils/metaplex';
import {
  createNoopSigner,
  publicKey,
  PublicKey,
} from '@metaplex-foundation/umi';
import {
  fetchCollection,
  updateCollection,
  updateCollectionPlugin,
} from '@metaplex-foundation/mpl-core';
import { COLLECTION_MANAGER_MULTISIG, MIN_COMPUTE_PRICE } from '../constants';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { isEqual } from 'lodash';
import { BadRequestException } from '@nestjs/common';
import { base58 } from '@metaplex-foundation/umi/serializers';

interface Options {
  collectionAddress: PublicKey;
}

@Command({
  name: 'transfer-authority-to-multisig',
  description:
    'Add delegate and transfer authority to multisig for the collection',
})
export class TransferAuthorityToMultisigCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask(
      'transfer-authority-to-multisig',
      options,
    );
    await this.transferAuthorityToMultisig(options);
  }

  async transferAuthorityToMultisig(options: Options) {
    log("🏗️  Starting 'transfer authority' command...");

    try {
      const { collectionAddress } = options;
      const delegate = getTreasuryUmiPublicKey();

      const collection = await fetchCollection(umi, collectionAddress);

      if (isEqual(collection.updateAuthority, COLLECTION_MANAGER_MULTISIG)) {
        throw new BadRequestException(
          `Collection ${collectionAddress.toString()} authority is already assigned to multisig`,
        );
      }

      const builder = setComputeUnitPrice(umi, {
        microLamports: MIN_COMPUTE_PRICE,
      });
      const addDelegatePlugin = updateCollectionPlugin(umi, {
        authority: createNoopSigner(delegate),
        collection: collectionAddress,
        payer: createNoopSigner(delegate),
        plugin: {
          type: 'UpdateDelegate',
          additionalDelegates: [
            ...collection.updateDelegate.additionalDelegates,
            delegate,
          ],
        },
      });

      const transferUpdateAuthority = updateCollection(umi, {
        newUpdateAuthority: publicKey(COLLECTION_MANAGER_MULTISIG),
        collection: collectionAddress,
      });

      const transaction = await builder
        .add(addDelegatePlugin)
        .add(transferUpdateAuthority)
        .buildAndSign(umi);
      const signature = await umi.rpc.sendTransaction(transaction, {
        commitment: 'confirmed',
      });

      console.log(
        `Transferred Authority for collection ${collectionAddress.toString()} to multisig : `,
        base58.deserialize(signature)[0],
      );
    } catch (e) {
      logErr(`Failed: ${e}`);
    }
  }
}
