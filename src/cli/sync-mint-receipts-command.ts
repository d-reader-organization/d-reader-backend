import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachine, CandyMachineReceipt } from '@prisma/client';
import { MPL_CORE_CANDY_GUARD_PROGRAM_ID } from '@metaplex-foundation/mpl-core-candy-machine';
import { Umi } from '@metaplex-foundation/umi';
import { getConnection, umi } from '../utils/metaplex';
import {
  AddressLookupTableAccount,
  Connection,
  TransactionMessage,
} from '@solana/web3.js';
import { getAsset } from '../utils/das';

@Command({
  name: 'sync-mint-receipts',
  description: 'sync the mint receipts',
})
export class SyncMintReceptsCommand extends CommandRunner {
  private readonly connection: Connection;
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
    private readonly heliusService: HeliusService,
  ) {
    super();
    this.umi = umi;
    this.connection = getConnection();
  }

  async run(): Promise<void> {
    await this.syncMintReceipts();
  }

  syncMintReceipts = async () => {
    log('\n🏗️  Syncing...');
    const receipts = await this.prisma.candyMachineReceipt.findMany({
      where: {
        OR: [
          { status: 'Processing' },
          {
            status: 'Processing',
            collectibleComics: {
              none: {},
            },
          },
        ],
      },
      include: { candyMachine: true },
    });

    for await (const receipt of receipts) {
      await this.syncTransaction(receipt);
    }
    log('Receipts Synced !');
  };

  async syncTransaction(
    receipt: CandyMachineReceipt & { candyMachine: CandyMachine },
  ) {
    try {
      const { transactionSignature, candyMachineAddress, id, candyMachine } =
        receipt;
      const transactionStatus = await this.connection.getSignatureStatuses(
        [transactionSignature],
        {
          searchTransactionHistory: true,
        },
      );
      console.log(transactionStatus.value);

      if (!transactionStatus || !transactionStatus.value[0]) {
        await this.prisma.candyMachineReceipt.update({
          where: { id: receipt.id },
          data: { status: 'Failed' },
        });
        return;
      }

      if (
        (transactionStatus.value[0] &&
          transactionStatus.value[0].confirmationStatus === 'confirmed') ||
        transactionStatus.value[0].confirmationStatus === 'finalized'
      ) {
        console.log('Syncing receipt :', id);

        const response = await this.connection.getTransaction(
          transactionSignature,
          { maxSupportedTransactionVersion: 0 },
        );

        if (response.meta.err) {
          return this.prisma.candyMachineReceipt.update({
            where: { id },
            data: { status: 'Failed' },
          });
        } else {
          const transactionMessage = response.transaction.message;
          let lookupTableAccounts: AddressLookupTableAccount;

          if (transactionMessage.addressTableLookups.length) {
            const lookupTableAddress =
              transactionMessage.addressTableLookups[0].accountKey;

            const lookupTable = await this.connection.getAddressLookupTable(
              lookupTableAddress,
            );
            lookupTableAccounts = lookupTable.value;
          }

          const decompiledTransaction = TransactionMessage.decompile(
            response.transaction.message,
            { addressLookupTableAccounts: [lookupTableAccounts] },
          );

          const reIndexAsset = this.reIndexCoreAsset(
            decompiledTransaction,
            candyMachineAddress,
            candyMachine.collectionAddress,
            id,
          );
          const updatedReceipt = this.prisma.candyMachineReceipt.update({
            where: { id: receipt.id },
            data: { status: 'Confirmed' },
          });

          return Promise.all([reIndexAsset, updatedReceipt]);
        }
      }
    } catch (e) {
      console.error('Error syncing receipt ', receipt.id, e);
    }
  }

  async reIndexCoreAsset(
    transaction: TransactionMessage,
    candyMachineAddress: string,
    collectionAddress: string,
    receiptId: number,
  ) {
    const assetAccounts: string[] = [];
    transaction.instructions.forEach((instruction) => {
      const isMintInstruction =
        instruction.programId.toString() ===
        MPL_CORE_CANDY_GUARD_PROGRAM_ID.toString();
      if (isMintInstruction) {
        const { pubkey } = instruction.keys.at(7);
        assetAccounts.push(pubkey.toString());
      }
    });

    try {
      const assets = (
        await Promise.all(
          assetAccounts.map((account) => {
            const assetData = getAsset(account);
            return assetData || null;
          }),
        )
      ).filter(Boolean);

      await this.heliusService.indexCoreAssets(
        assets,
        candyMachineAddress,
        collectionAddress,
        receiptId,
      );
    } catch (e) {
      console.error(e);
    }
  }
}
