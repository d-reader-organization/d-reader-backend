import { PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { cb, log, logErr } from './chalk';

interface Options {
  candyMachineAddress: PublicKey;
}

@Command({
  name: 'delete-candy-machine',
  description: 'Delete thye provided candymachine',
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
    log("🏗️  Starting 'mint one' command...");
    const { candyMachineAddress } = options;
    await this.candyMachineService.deleteCandyMachine(candyMachineAddress);
    try {
      log(cb('⛏️  Delete the candymachine'));

      log('✅ Minted successfully');
    } catch (e) {
      logErr(
        `Failed to mint from ${options.candyMachineAddress.toBase58()}: ${e}`,
      );
    }
  }
}
