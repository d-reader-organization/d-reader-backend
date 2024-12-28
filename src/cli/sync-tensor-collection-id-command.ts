import { Command, CommandRunner } from 'nest-commander';
import { log, logErr } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import { getCollectionFromTensor } from '../utils/das';
import { TokenStandard } from '@prisma/client';

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

    try {
      const collections = await this.prisma.collectibleComicCollection.findMany(
        {where:{
          candyMachines:{
            some:{
              standard: TokenStandard.Core
            }
          }
        }},
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
    } catch (error) {
      logErr(`Error syncing collection ids from tensor: ${error}`);
    }
    log('\n');
  };
}
