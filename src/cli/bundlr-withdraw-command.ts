import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cg, log } from './chalk';
import { metaplex } from '../../src/utils/metaplex';
import { BundlrStorageDriver, toBigNumber } from '@metaplex-foundation/js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

@Command({
  name: 'bundlr-withdraw',
  description: 'Withdraw balance from bundlr',
})
export class BundlrWithdrawCommand extends CommandRunner {
  constructor(private readonly inquirerService: InquirerService) {
    super();
  }

  async run(): Promise<void> {
    await this.withdraw();
  }

  withdraw = async () => {
    log('\n🏗️  Withdrawing money from bundlr...\n');

    const storage = metaplex.storage().driver() as BundlrStorageDriver;
    const treasuryPubKey = metaplex.identity().publicKey.toBase58();
    const bundlr = await storage.bundlr();
    const balance = await bundlr.getBalance(treasuryPubKey);
    const solBalance = balance.toNumber() / LAMPORTS_PER_SOL;
    log(`💰  Current bundlr balance: ${solBalance}`);

    const minimumBalance = toBigNumber(5000);
    const balanceToWithdraw = balance.minus(minimumBalance.toNumber());

    await bundlr.withdrawBalance(balanceToWithdraw);
    log(cg('💻 Withdrew from bundlr! '));

    const newBalance = await bundlr.getBalance(treasuryPubKey);
    const newSolBalance = newBalance.toNumber() / LAMPORTS_PER_SOL;
    log(`💰  New bundlr balance: ${newSolBalance}`);
    return;
  };
}
