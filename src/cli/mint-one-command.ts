import {
  Cluster,
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { decodeTransaction } from '../utils/transactions';
import { cb, cuy, log, logErr } from './chalk';
import * as Utf8 from 'crypto-js/enc-utf8';
import * as AES from 'crypto-js/aes';

interface Options {
  candyMachineAddress: PublicKey;
}

@Command({
  name: 'mint-one',
  description: 'Mint one NFT from the specified CM to the treasury wallet',
})
export class MintOneCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('mint', options);
    await this.mintOne(options);
  }

  async mintOne(options: Options) {
    log("🏗️  Starting 'mint one' command...");
    const endpoint = clusterApiUrl(process.env.SOLANA_CLUSTER as Cluster);
    const connection = new Connection(endpoint, 'confirmed');

    const wallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(wallet.toString(Utf8))),
    );

    const encodedTransaction =
      await this.candyMachineService.constructMintOneTransaction(
        keypair.publicKey,
        options.candyMachineAddress,
      );
    const transaction = decodeTransaction(encodedTransaction, 'base64');
    transaction.partialSign(keypair);

    try {
      log(cb('⛏️  Minting'));
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
      );
      log('✅ Minted successfully');
      log(`✍️  Signature: ${cuy(signature)}`);
    } catch (e) {
      logErr(`Failed to mint from ${options.candyMachineAddress.toBase58()}`);
      console.log(e);
    }
  }
}
