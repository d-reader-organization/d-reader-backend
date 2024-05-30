import { PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { umi } from '../utils/metaplex';
import { publicKey } from '@metaplex-foundation/umi';

interface Options {
  candyMachineAddress: PublicKey;
}

@Command({
  name: 'fetch-candy-machine',
  description: 'Fetch Core Candy Machine info from the address',
})
export class FetchCandyMachineCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('fetch-candy-machine', options);
    await this.fetchCandyMachine(options);
  }

  async fetchCandyMachine(options: Options) {
    log("🏗️  Starting 'fetch candy machine' command...");

    try {
      const candyMachine = await fetchCandyMachine(
        umi,
        publicKey(options.candyMachineAddress),
        { commitment: 'confirmed' },
      );

      log('✅ Fetched successfully');
      log(candyMachine);
    } catch (e) {
      logErr(
        `Failed to fetch the candy machine on address ${options.candyMachineAddress.toBase58()}: ${e}`,
      );
    }
  }
}
