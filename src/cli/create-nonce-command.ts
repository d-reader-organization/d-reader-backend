import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log } from './chalk';
import { NonceService } from '../nonce/nonce.service';

interface Options {
  count: number;
}

@Command({
  name: 'create-nonce',
  description: 'Create nonce accounts',
})
export class CreateNonceCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly nonceService: NonceService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('create-nonce', options);
    await this.createNonce(options);
  }

  async createNonce(options: Options) {
    log("🏗️  Starting 'create-nonce' command...");

    const { count } = options;
    const nonceCreated = await this.nonceService.create(count);
    console.log(`${nonceCreated} nonce accounts are created successfully`);
  }
}
