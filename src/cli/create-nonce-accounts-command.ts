import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cb, log, logErr } from './chalk';
import { NonceService } from 'src/nonce/nonce.service';

interface Options {
  supply: number;
}

@Command({
  name: 'create-nonce-accounts',
  description: 'create nonce accounts and save them in the database',
})
export class CreateNonceAccountsCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly nonceService: NonceService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('create-nonce', options);
    await this.createNonceAccounts(options);
  }

  async createNonceAccounts(options: Options) {
    log("🏗️  Starting 'create-nonce-accounts' command...");
    try {
      log(cb('⛏️  Creating Nonce'));
      await this.nonceService.create(options.supply);
      log(`✅ ${options.supply} nonce are created`);
    } catch (e) {
      logErr(`Failed to create nonce accounts`);
      console.log(e);
    }
  }
}
