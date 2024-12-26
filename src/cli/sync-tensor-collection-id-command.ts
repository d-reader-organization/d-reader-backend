import { Command, CommandRunner } from 'nest-commander';
import { log, logErr } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import { getCollectionFromTensor } from '../utils/das';

@Command({
  name: 'sync-tensor-collection-id',
  description: 'sync the all the collection ids from Tensor',
})
export class SyncTensorCollectionIdCommand extends CommandRunner {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async run(): Promise<void> {
    await this.syncTensorCollectionId();
  }

  syncTensorCollectionId = async () => {
    log('\n🏗️  Syncing tensor collection id...');

    const collections = await this.prisma.collectibleComicCollection.findMany(
      {},
    );

    for await (const collection of collections) {
      const tensorCollection = await getCollectionFromTensor(
        collection.address,
      );
      await this.prisma.collectibleComicCollection.update({
        where: { address: collection.address },
        data: { tensorCollectionID: tensorCollection.collId },
      });
    }

    try {
    } catch (error) {
      logErr(`Error syncing collection ids from tensor: ${error}`);
    }
    log('\n');
  };
}
