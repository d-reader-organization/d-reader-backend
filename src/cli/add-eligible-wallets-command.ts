import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { CandyMachineService } from '../candy-machine/candy-machine.service';

interface Options {
  couponId: number;
  wallets: string[];
}

@Command({
  name: 'add-eligible-wallets',
  description: 'add eligible wallets to coupon',
})
export class AddEligibleWalletsCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('add-allow-list', options);
    await this.addEligibleWallets(options);
  }

  async addEligibleWallets(options: Options) {
    log('\n🏗️  adding eligible wallets to coupon');
    try {
      const { couponId, wallets } = options;
      await this.candyMachineService.addEligibleWalletsToCoupon(
        couponId,
        wallets,
      );
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  }
}
