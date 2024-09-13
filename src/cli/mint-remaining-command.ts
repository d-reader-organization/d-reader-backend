import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cb, cuy, log, logErr } from './chalk';
import { constructMultipleMintTransaction } from '../candy-machine/instructions';
import { Metaplex } from '@metaplex-foundation/js';
import { metaplex, umi } from '../utils/metaplex';
import { AUTHORITY_GROUP_LABEL } from '../constants';
import { PrismaService } from 'nestjs-prisma';
import { TokenStandard } from '@prisma/client';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { getTransactionWithPriorityFee } from '../utils/das';

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
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.metaplex = metaplex;
    this.umi = umi;
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
    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address: candyMachineAddress.toString() },
    });
    if (candyMachine.standard !== TokenStandard.Core) {
      throw new Error('Only Core mint is supported');
    }
    const CORE_MINT_COMPUTE_BUDGET = 800000;
    // Todo: use chunking to do 5 mint in 1 tx
    const encodedTransactions = await getTransactionWithPriorityFee(
      constructMultipleMintTransaction,
      CORE_MINT_COMPUTE_BUDGET,
      this.umi,
      publicKey(candyMachineAddress),
      publicKey(authority.publicKey),
      AUTHORITY_GROUP_LABEL,
      [authority.publicKey.toString()],
      1,
      candyMachine.lookupTable,
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
        { skipPreflight: true },
      );
      log(`✍️  Signature: ${cuy(signature)}`);
    }
    log('✅ Minted successfully');
  }
}
