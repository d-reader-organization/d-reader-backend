import { PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { cb, cuy, log, logErr } from './chalk';

interface Options {
  candyMachineAddress: PublicKey;
}

@Command({
  name: 'delete-candy-machine',
  description: 'Delete the provided candymachine and candyguard',
})
export class DeleteCandyMachineCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('delete-candy-machine', options);
    await this.deleteCandyMachine(options);
  }

  async deleteCandyMachine(options: Options) {
    log("🏗️  Starting 'delete-candy-machine' command...");
    const { candyMachineAddress } = options;
    try {
      const signature = await this.candyMachineService.deleteCandyMachine(
        candyMachineAddress,
      );
      log(cb('⛏️  CandyMachine deleted successfully'));
      log(`✍️  Signature: ${cuy(signature)}`);
    } catch (e) {
      logErr(
        `Failed to delete candymachine ${options.candyMachineAddress.toBase58()}: ${e}`,
      );
    }
  }
}
