import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { WalletService } from '../wallet/wallet.service';
import { PublicKey } from '@metaplex-foundation/js';

interface Options {
  wallet: string;
}

@Command({
  name: 'sync-wallet',
  description: 'sync the provided wallet with onchain nft data',
})
export class SyncWalletCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly walletService: WalletService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('wallet', options);
    await this.syncWallet(options);
  }

  syncWallet = async (options: Options) => {
    log('\n🏗️  Syncing wallet...');

    const { wallet } = options;
    try {
      const owner = new PublicKey(wallet);
      await this.walletService.syncWallet(owner);
    } catch (error) {
      logErr(`Error syncing wallet ${wallet} : ${error}`);
    }
    log('\n');
  };
}
