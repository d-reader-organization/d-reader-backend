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
import { PrismaService } from 'nestjs-prisma';
import { publicKey } from '@metaplex-foundation/umi';
import { SOL_ADDRESS } from '../constants';
import { CouponType } from '@prisma/client';

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
    private readonly prisma: PrismaService,
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

    const coupon = await this.prisma.candyMachineCoupon.findFirst({
      where: {
        candyMachineAddress: options.candyMachineAddress.toString(),
        type: CouponType.PublicUser,
        currencySettings: { some: { splTokenAddress: SOL_ADDRESS } },
      },
      include: {
        currencySettings: { where: { splTokenAddress: SOL_ADDRESS } },
      },
    });

    if (!coupon) {
      logErr(
        `Coupon not found for candy machine address: ${options.candyMachineAddress.toString()}`,
      );
      return;
    }

    const encodedTransaction =
      await this.candyMachineService.createMintTransaction(
        publicKey(keypair.publicKey.toString()),
        publicKey(options.candyMachineAddress.toString()),
        coupon.currencySettings.at(-1).label,
        coupon.id,
      );
    const transactionBuffer = Buffer.from(encodedTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuffer);
    transaction.sign([keypair]);
    try {
      log(cb('⛏️  Minting'));
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: true },
      );
      log(`✍️  Signature: ${cuy(signature)}`);
      log('✅ Minted successfully');
    } catch (e) {
      logErr(
        `Failed to mint from ${options.candyMachineAddress.toBase58()}: ${e}`,
      );
    }
  }
}
