import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { CandyMachineService } from '../candy-machine/candy-machine.service';

interface Options {
  couponId: number;
  wallets: string[];
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
      const { couponId, wallets } = options;
      await this.candyMachineService.addWhitelistedWalletsToCoupon(
        couponId,
        wallets,
      );
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  }
}
