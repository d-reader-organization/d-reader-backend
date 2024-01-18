import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { chunk } from 'lodash';

interface Options {
  nfts: string[];
}

@Command({
  name: 'sync-collection',
  description: 'sync the provided collection with onchain NFT data',
})
export class SyncCollectionCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('sync-collection', options);
    await this.syncCollection(options);
  }

  //TODO: Fetch all collection nfts in the function itself.
  syncCollection = async (options: Options) => {
    log('\n🏗️  Syncing collection...');

    const { nfts } = options;

    const items = chunk(nfts, 100);
    for await (const item of items) {
      await this.candyMachineService.syncCollection(item);
    }
    try {
    } catch (error) {
      logErr(`Error syncing collction: ${error}`);
    }
    log('\n');
  };
}
