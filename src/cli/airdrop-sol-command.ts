import { Cluster, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { sol } from '@metaplex-foundation/js';
import { cb, cuy, log, logErr } from './chalk';
import { sleep } from '../utils/helpers';
import { initMetaplex } from '../utils/metaplex';

interface Options {
  cluster: Cluster;
  address: PublicKey;
  dropAmount: number;
}

@Command({
  name: 'airdrop-sol',
  description: 'Airdrop Solana token to a specific wallet',
})
export class AirdropSolCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('airdrop-sol', options);
    await this.airdropSol(options);
  }

  async airdropSol(options: Options) {
    const endpoint = clusterApiUrl(options.cluster);
    const metaplex = initMetaplex(endpoint);

    try {
      log(cb('🪂 Airdropping SOL'));
      await metaplex.rpc().airdrop(options.address, sol(options.dropAmount));
      await sleep(1000);
      log(`✅ Airdropped ${cuy(options.dropAmount + ' Sol')} successfully!`);
    } catch (e) {
      logErr(`Failed to drop ${options.dropAmount} Sol`);
      log(cuy('Try airdropping manually on ', cb('https://solfaucet.com')));
    }
  }
}
