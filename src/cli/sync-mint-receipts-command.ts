import { Command, CommandRunner } from 'nest-commander';
import { log } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import { DigitalAssetService } from '../digital-asset/digital-asset.service';

@Command({
  name: 'sync-mint-receipts',
  description: 'sync the mint receipts',
})
export class SyncMintReceptsCommand extends CommandRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly digitalAssetService: DigitalAssetService,
  ) {
    super();
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
      await this.digitalAssetService.fetchAndIndexFromReceiptTransaction(
        receipt,
      );
    }
  };
}
