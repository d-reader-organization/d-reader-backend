import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { WalletService } from '../wallet/wallet.service';
import { getAssetsByGroup } from '../utils/das';
import { PrismaService } from 'nestjs-prisma';
import { Interface } from 'helius-sdk';
import { isEmpty } from 'lodash';

interface Options {
  collection: string;
}

@Command({
  name: 'sync-collection',
  description: 'sync the provided collection with onchain NFT data',
})
export class SyncCollectionCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('sync-collection', options);
    await this.syncCollection(options);
  }

  syncCollection = async (options: Options) => {
    log('\n🏗️  Syncing collection...');
    const { collection } = options;

    try {
      const candyMachines = await this.prisma.candyMachine.findMany({
        select: { address: true },
      });
      const compeleteNfts = await this.prisma.digitalAsset
        .findMany({
          where: { metadata: { collectionAddress: collection } },
        })
        .then((nfts) => nfts.map((nft) => nft.address));

      const limit = 100;
      let page = 1;
      let assets = await getAssetsByGroup(collection, page, limit);

      while (!isEmpty(assets)) {
        console.log(`Syncing ${assets.length} assets ...!`);

        const legacyAssets = assets.filter(
          (asset) => asset.interface == Interface.PROGRAMMABLENFT,
        );

        await this.walletService.syncLegacyAssets(
          candyMachines,
          compeleteNfts,
          legacyAssets,
        );

        page++;
        assets = await getAssetsByGroup(collection, page, limit);
      }
    } catch (e) {
      logErr(`Error syncing collction: ${e}`);
    }
    log('\n');
  };
}
