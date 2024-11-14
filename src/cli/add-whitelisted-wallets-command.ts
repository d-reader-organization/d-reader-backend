import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { getAssetsByGroup } from '../utils/das';
import { isEmpty } from 'lodash';

interface Options {
  collection: string;
  couponId: number;
}

@Command({
  name: 'add-whitelisted-wallets',
  description: 'add eligible wallets to coupon',
})
export class AddWhitelistedWalletsCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask(
      'add-whitelisted-wallets',
      options,
    );
    await this.addWhitelistedWallets(options);
  }

  async addWhitelistedWallets(options: Options) {
    log('\n🏗️  adding whitelisted wallets to coupon');
    try {
      const { couponId, collection } = options;
      const limit = 1000;
      let page = 1;
      let assets = await getAssetsByGroup(collection, page, limit);
      const wallets: Set<string> = new Set();

      while (!isEmpty(assets)) {
        console.log(`Adding ${assets.length} assets in the array...!`);

        for (const asset of assets) {
          const ownerAddress = asset.ownership.owner;
          wallets.add(ownerAddress);
        }
        page++;
        assets = await getAssetsByGroup(collection, page, limit);
      }
      await this.candyMachineService.addWhitelistedWalletsToCoupon(
        couponId,
        Array.from(wallets),
      );
      log(`Added ${wallets.size} unique wallets in whitelist\n`);
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  }
}
