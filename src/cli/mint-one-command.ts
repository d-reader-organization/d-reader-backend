import {
  Cluster,
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { cb, cuy, log, logErr } from './chalk';
import * as Utf8 from 'crypto-js/enc-utf8';
import * as AES from 'crypto-js/aes';
import { constructMintOneTransaction } from '../candy-machine/instructions';
import { Metaplex } from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';

interface Options {
  candyMachineAddress: PublicKey;
  label: string;
}

@Command({
  name: 'mint-one',
  description: 'Mint one NFT from the specified CM to the treasury wallet',
})
export class MintOneCommand extends CommandRunner {
  private readonly metaplex: Metaplex;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
    this.metaplex = metaplex;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('mint', options);
    await this.mintOne(options);
  }

  async mintOne(options: Options) {
    log("🏗️  Starting 'mint one' command...");
    const endpoint = clusterApiUrl(process.env.SOLANA_CLUSTER as Cluster);
    const connection = new Connection(endpoint, 'confirmed');
    const { candyMachineAddress, label } = options;

    const wallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(wallet.toString(Utf8))),
    );
    const { allowList, candyMachine, mintPrice } =
      await this.candyMachineService.findCandyMachineData(
        candyMachineAddress.toString(),
        label,
      );
    const { compressed, collectionNftAddress } = candyMachine;

    let encodedTransactions: string[];
    if (compressed) {
      encodedTransactions =
        await this.candyMachineService.createMintCnftTransaction(
          keypair.publicKey.toString(),
          candyMachineAddress.toString(),
          collectionNftAddress.toString(),
          candyMachine.supply,
          mintPrice,
        );
    } else {
      encodedTransactions = await constructMintOneTransaction(
        metaplex,
        keypair.publicKey,
        candyMachineAddress,
        label,
        allowList,
        candyMachine.lookupTable,
      );
    }

    const transactions = encodedTransactions.map((encodedTransaction) => {
      const transactionBuffer = Buffer.from(encodedTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      if (!compressed) {
        transaction.sign([keypair]);
      }
      return transaction;
    });
    try {
      log(cb('⛏️  Minting'));
      for (const transaction of transactions) {
        const signature = await connection.sendRawTransaction(
          transaction.serialize(),
        );
        log(`✍️  Signature: ${cuy(signature)}`);
      }
      log('✅ Minted successfully');
    } catch (e) {
      logErr(
        `Failed to mint from ${options.candyMachineAddress.toBase58()}: ${e}`,
      );
    }
  }
}
