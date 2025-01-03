import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { PrismaService } from 'nestjs-prisma';
import { fetchActiveTensorListings } from '../utils/das';

interface Options {
  collectionAddress?: string;
}

@Command({
  name: 'sync-tensor-listings',
  description: 'sync the all the listings of a collection from Tensor',
})
export class SyncTensorListingsCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly auctionHouseService: AuctionHouseService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('sync-tensor-listings', options);
    await this.syncTensorListings(options);
  }

  syncTensorListings = async (options: Options) => {
    log('\n🏗️  Syncing listings...');

    const { collectionAddress } = options;
    const collections = await this.prisma.collectibleComicCollection.findMany({
      where: { address: collectionAddress },
    });
    for await (const collection of collections) {
      if (collection.tensorCollectionID) {
        await this.syncCollectionsListing(collection.tensorCollectionID);
      }
    }

    try {
    } catch (error) {
      logErr(`Error syncing collction: ${error}`);
    }
    log('\n');
  };

  async syncCollectionsListing(tensorCollectionID: string) {
    let hasMore = true;
    let endCursor: string = null;
    let curr = 0;
    while (hasMore) {
      console.log(`Fetching listings ${curr} - ${curr + 100}`);
      const listings = await fetchActiveTensorListings(
        tensorCollectionID,
        100,
        endCursor,
      );
      endCursor = listings.page.endCursor;
      hasMore = listings.page.hasMore;
      curr += listings.mints.length;
      await this.auctionHouseService.syncTensorListings(listings.mints);
    }
  }
}
