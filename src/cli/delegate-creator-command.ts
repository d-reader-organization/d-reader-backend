import {
  Cluster,
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cb, log, logErr } from './chalk';
import * as Utf8 from 'crypto-js/enc-utf8';
import * as AES from 'crypto-js/aes';
import { decodeTransaction } from '../utils/transactions';
import { TransactionService } from '../transactions/transaction.service';

interface Options {
  candyMachineAddress: PublicKey;
  newCreator: PublicKey;
}

@Command({
  name: 'delegate-creator',
  description: 'Delegate new creator authority to sign comics',
})
export class DelegateCreatorCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly transactionService: TransactionService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('delegate-creator', options);
    await this.delegateCreator(options);
  }

  async delegateCreator(options: Options) {
    log("🏗️  Starting 'delegate-creator' command...");
    const endpoint = clusterApiUrl(process.env.SOLANA_CLUSTER as Cluster);
    const connection = new Connection(endpoint, 'confirmed');

    const wallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(wallet.toString(Utf8))),
    );

    const { candyMachineAddress, newCreator } = options;
    const encodedTransaction =
      await this.transactionService.createDelegateCreatorTransaction(
        candyMachineAddress,
        newCreator,
        keypair.publicKey,
      );

    try {
      log(cb('⛏️  Delegating new creator'));
      const transaction = decodeTransaction(encodedTransaction, 'base64');
      const signature = sendAndConfirmTransaction(connection, transaction, [
        keypair,
      ]);

      log(
        `Successfully delegated the signing authority to new creator ${signature}`,
      );
    } catch (e) {
      logErr(`Failed to delegate creator: ${e}`);
    }
  }
}
