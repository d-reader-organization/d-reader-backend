import { PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { cb, cuy, log, logErr } from './chalk';
import { constructMultipleMintTransaction } from '../candy-machine/instructions';
import {
  getIdentityUmiSignature,
  getTreasuryPublicKey,
  umi,
} from '../utils/metaplex';
import { AUTHORITY_GROUP_LABEL } from '../constants';
import { PrismaService } from 'nestjs-prisma';
import { TokenStandard } from '@prisma/client';
import { Umi, publicKey } from '@metaplex-foundation/umi';
import { getTransactionWithPriorityFee } from '../utils/das';
import {
  decodeUmiTransaction,
  encodeUmiTransaction,
} from '../utils/transactions';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { CandyMachineService } from '../candy-machine/candy-machine.service';

interface Options {
  candyMachineAddress: PublicKey;
  supply: number;
}

@Command({
  name: 'mint-remaining',
  description: 'Mint from remaining candymachine supply by authority',
})
export class MintRemainingCommand extends CommandRunner {
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
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
    let supplyLeft = supply;
    for (; i < Math.ceil(supply / 3); i++) {
      try {
        const numberOfItems = Math.min(3, supplyLeft);
        await this.mint(candyMachineAddress, numberOfItems);
        supplyLeft -= numberOfItems;
      } catch (e) {
        logErr(
          `Mint stopped due to failiure from candymachine ${candyMachineAddress.toBase58()}: ${e}`,
        );
        break;
      }
    }
    log(cb(`Successfully minted ${supply - supplyLeft} assets`));
  }

  async mint(candyMachineAddress: PublicKey, numberOfItems: number) {
    const authority = getTreasuryPublicKey();
    const candyMachine = await this.prisma.candyMachine.findUnique({
      where: { address: candyMachineAddress.toString() },
    });
    if (candyMachine.standard !== TokenStandard.Core) {
      throw new Error('Only Core mint is supported');
    }
    const CORE_MINT_COMPUTE_BUDGET = 800000;
    // Todo: use chunking to do 5 mint in 1 tx
    const mintTransaction = await getTransactionWithPriorityFee(
      constructMultipleMintTransaction,
      CORE_MINT_COMPUTE_BUDGET,
      this.umi,
      publicKey(candyMachineAddress),
      authority,
      AUTHORITY_GROUP_LABEL,
      numberOfItems,
      candyMachine.lookupTable,
      false,
    );

    const decodedTransaction = decodeUmiTransaction(mintTransaction);
    const signedTransaction = await getIdentityUmiSignature(decodedTransaction);
    const encodedMintTransaction = encodeUmiTransaction(
      signedTransaction,
      'base64',
    );

    log(cb('⛏️  Minting'));
    const signature =
      await this.candyMachineService.validateAndSendMintTransaction(
        [encodedMintTransaction],
        authority.toString(),
      );

    log(`✍️  Signature: ${cuy(base58.deserialize(signature))}`);
    log('✅ Minted successfully');
  }
}
