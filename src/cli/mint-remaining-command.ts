import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cb, cuy, log, logErr } from './chalk';
import { constructMintOneTransaction } from '../candy-machine/instructions';
import { Metaplex } from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { AUTHORITY_GROUP_LABEL } from '../constants';

interface Options {
  candyMachineAddress: PublicKey;
  supply: number;
}

@Command({
  name: 'mint-remaining',
  description: 'Mint from remaining candymachine supply by authority',
})
export class MintRemainingCommand extends CommandRunner {
  private readonly metaplex: Metaplex;
  constructor(private readonly inquirerService: InquirerService) {
    super();
    this.metaplex = metaplex;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('mint-remaining', options);
    await this.mintRemaining(options);
  }

  async mintRemaining(options: Options) {
    log("🏗️  Starting 'mint remaining' command...");
    const { candyMachineAddress, supply } = options;
    let i = 0;
    for (; i < supply; i++) {
      try {
        await this.mint(candyMachineAddress);
      } catch (e) {
        logErr(
          `Mint stopped due to failiure from candymachine ${candyMachineAddress.toBase58()}: ${e}`,
        );
        break;
      }
    }
    log(cb(`Successfully minted ${i} nfts`));
  }

  async mint(candyMachineAddress: PublicKey) {
    const authority = this.metaplex.identity();
    const encodedTransactions = await constructMintOneTransaction(
      this.metaplex,
      authority.publicKey,
      candyMachineAddress,
      AUTHORITY_GROUP_LABEL,
      [authority.publicKey.toString()],
    );
    const transactions = encodedTransactions.map((encodedTransaction) => {
      const transactionBuffer = Buffer.from(encodedTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      transaction.sign([authority]);
      return transaction;
    });
    log(cb('⛏️  Minting'));
    for (const transaction of transactions) {
      const signature = await metaplex.connection.sendRawTransaction(
        transaction.serialize(),
      );
      log(`✍️  Signature: ${cuy(signature)}`);
    }
    log('✅ Minted successfully');
  }
}
