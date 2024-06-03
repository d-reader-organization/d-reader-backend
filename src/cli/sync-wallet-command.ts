import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from 'nestjs-prisma';

interface Options {
  address: string;
}

@Command({
  name: 'sync-wallet',
  description: 'sync the provided wallet with onchain NFT data',
})
export class SyncWalletCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('sync-wallet', options);
    await this.syncWallet(options);
  }

  syncWallet = async (options: Options) => {
    log('\n🏗️  Syncing wallet...');

    const { address } = options;

    let addresses: string[] = [address];
    try {
      if (!address) {
        const wallets = await this.prisma.wallet.findMany();
        addresses = wallets.map((w) => w.address);
      }

      let i = 1;
      for await (const address of addresses) {
        log(`syncing wallet (${i}/${addresses.length}): ${address}`);
        await this.walletService.syncWallet(address);
        i += 1;
      }
    } catch (error) {
      logErr(`Error syncing wallet ${address}: ${error}`);
    }
    log('\n');
  };
}
