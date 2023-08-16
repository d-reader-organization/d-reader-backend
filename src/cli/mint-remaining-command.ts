import { PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { decodeTransaction } from '../utils/transactions';
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
    const encodedTransaction = await constructMintOneTransaction(
      this.metaplex,
      authority.publicKey,
      candyMachineAddress,
      AUTHORITY_GROUP_LABEL,
      [authority.publicKey.toString()],
    );
    const transaction = decodeTransaction(encodedTransaction, 'base64');
    transaction.partialSign(authority);
    log(cb('⛏️  Minting'));
    const signature = await this.metaplex.connection.sendRawTransaction(
      transaction.serialize(),
    );
    log('✅ Minted successfully');
    log(`✍️  Signature: ${cuy(signature)}`);
  }
}
