import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cg, log } from './chalk';
import { metaplex } from '../utils/metaplex';
import { BundlrStorageDriver } from '@metaplex-foundation/js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface Options {
  fundAmount: number;
}

@Command({
  name: 'bundlr-fund',
  description: 'Fund balance from bundlr',
})
export class BundlrFundCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('bundlr-fund', options);
    await this.fund(options);
  }

  fund = async (options: Options) => {
    log('\n🏗️  Funding money from bundlr...\n');

    const storage = metaplex.storage().driver() as BundlrStorageDriver;
    const treasuryPubKey = metaplex.identity().publicKey.toBase58();
    const bundlr = await storage.bundlr();
    const balance = await bundlr.getBalance(treasuryPubKey);
    const solBalance = balance.toNumber() / LAMPORTS_PER_SOL;
    log(`💰  Current bundlr balance: ${solBalance}`);

    await bundlr.fund(options.fundAmount * LAMPORTS_PER_SOL);
    log(cg('💻 Funded bundlr! '));

    const newBalance = await bundlr.getBalance(treasuryPubKey);
    const newSolBalance = newBalance.toNumber() / LAMPORTS_PER_SOL;
    log(`💰  New bundlr balance: ${newSolBalance}`);
    return;
  };
}
