import { PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cb, cuy, log, logErr } from './chalk';
import { constructMultipleMintTransaction } from '../candy-machine/instructions';
import { Metaplex } from '@metaplex-foundation/js';
import {
  getIdentityUmiSignature,
  getThirdPartyUmiSignature,
  getTreasuryPublicKey,
  metaplex,
  umi,
} from '../utils/metaplex';
import { AUTHORITY_GROUP_LABEL } from '../constants';
import { PrismaService } from 'nestjs-prisma';
import { TokenStandard } from '@prisma/client';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { getTransactionWithPriorityFee } from '../utils/das';
import { decodeUmiTransaction } from '../utils/transactions';
import { base58 } from '@metaplex-foundation/umi/serializers';

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
    const authority = getTreasuryPublicKey();
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
      authority,
      AUTHORITY_GROUP_LABEL,
      1,
      candyMachine.lookupTable,
      false,
    );

    const mintTransaction = encodedTransactions.at(-1);
    const transaction = decodeUmiTransaction(mintTransaction);
    const transactionSignedByThirdParty = await getThirdPartyUmiSignature(
      transaction,
    );
    const signedTransaction = await getIdentityUmiSignature(
      transactionSignedByThirdParty,
    );

    log(cb('⛏️  Minting'));
    const latestBlockHash = await this.umi.rpc.getLatestBlockhash({
      commitment: 'confirmed',
    });

    const signature = await this.umi.rpc.sendTransaction(signedTransaction, {
      skipPreflight: true,
    });
    await this.umi.rpc.confirmTransaction(signature, {
      strategy: { type: 'blockhash', ...latestBlockHash },
    });

    log(`✍️  Signature: ${cuy(base58.deserialize(signature))}`);
    log('✅ Minted successfully');
  }
}
