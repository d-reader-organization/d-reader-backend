import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { PrismaService } from 'nestjs-prisma';
import {
  chunk,
  publicKey,
  TransactionBuilder,
  TransactionStatus,
  Umi,
} from '@metaplex-foundation/umi';
import { NonceService } from '../nonce/nonce.service';
import { umi } from '../utils/metaplex';
import { getRarityShareTable, rateLimitQuota } from '../constants';
import { addConfigLines } from '@metaplex-foundation/mpl-core-candy-machine';
import { fromWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';
import {
  setComputeUnitLimit,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { NonceAccountArgs } from '../nonce/types';
import { sleep } from '../utils/helpers';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { Transaction as UmiTransaction } from '@metaplex-foundation/umi';
import { pRateLimit } from 'p-ratelimit';
import { TransactionIterationType } from './insert-items-questions';

interface Options {
  candyMachineAddress: string;
  iteration: TransactionIterationType;
}

@Command({
  name: 'insert-items',
  description: 'Insert items in candymachine',
})
export class InsertItemsCommand extends CommandRunner {
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly nonceService: NonceService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.umi = umi;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('insert-items', options);
    await this.insertItems(options);
  }

  async insertItems(options: Options) {
    const { candyMachineAddress, iteration } = options;
    const candyMachineData = await this.prisma.candyMachine.findUnique({
      where: { address: candyMachineAddress },
      include: { collection: true },
    });

    const items: { uri: string; name: string }[] = [];
    const collectionName = candyMachineData.collection.name;
    const itemMetadatas = await this.prisma.collectibleComicMetadata.findMany({
      where: { collectionAddress: candyMachineData.collectionAddress },
    });

    const numberOfRarities = itemMetadatas.length / 4;
    const unusedUnsignedMetadatas = itemMetadatas.filter(
      (item) => !item.isUsed && !item.isSigned,
    );

    let supplyLeft = candyMachineData.supply;
    let itr = 0,
      nameIndex = 0;
    const rarityShares = getRarityShareTable(numberOfRarities);

    for (const data of unusedUnsignedMetadatas) {
      let supply: number;
      const { value } = rarityShares[itr];

      if (itr == rarityShares.length - 1) {
        supply = supplyLeft;
      } else {
        supply = Math.floor((candyMachineData.supply * value) / 100);
        supplyLeft -= supply;
      }
      const indexArray = Array.from(Array(supply).keys());
      const itemsInserted = indexArray.map(() => {
        nameIndex++;
        return {
          uri: data.uri,
          name: `${collectionName} #${nameIndex}`,
        };
      });

      items.push(...itemsInserted);
      itr++;
    }

    const INSERT_CHUNK_SIZE = 8;
    const itemChunks = chunk(items, INSERT_CHUNK_SIZE);

    let index = 0;
    const transactionBuilders: TransactionBuilder[] = [];
    for (const itemsChunk of itemChunks) {
      const transactionBuilder = addConfigLines(umi, {
        index,
        configLines: itemsChunk,
        candyMachine: publicKey(candyMachineAddress),
      });

      index += itemsChunk.length;
      transactionBuilders.push(transactionBuilder);
    }

    if (iteration === TransactionIterationType.Single) {
      await this.iterateTxSync(transactionBuilders);
    } else {
      await this.iterateTxParallel(transactionBuilders);
    }

    console.log(`All items inserted .. !`);
  }

  async iterateTxParallel(transactionBuilders: TransactionBuilder[]) {
    const builderChunks = chunk(transactionBuilders, 10);

    for await (const builderChunk of builderChunks) {
      const rateLimit = pRateLimit(rateLimitQuota);
      for (const addConfigLineBuilder of builderChunk) {
        const builder = setComputeUnitPrice(umi, {
          microLamports: 800_000,
        }).add(addConfigLineBuilder);

        rateLimit(() => {
          return builder.sendAndConfirm(umi, {
            send: { commitment: 'confirmed', skipPreflight: true },
          });
        });
      }
    }
  }

  async iterateTxSync(transactionBuilders: TransactionBuilder[]) {
    let count = 0;
    for await (const addConfigLineBuilder of transactionBuilders) {
      console.info(`Inserting items ${count}-${count + 8} `);

      let val = false;
      while (!val) {
        const nonceArgs = await this.nonceService.getNonce();
        const advanceNonceInstruction = fromWeb3JsInstruction(
          SystemProgram.nonceAdvance({
            noncePubkey: new PublicKey(nonceArgs.address),
            authorizedPubkey: new PublicKey(
              this.umi.identity.publicKey.toString(),
            ),
          }),
        );

        let builder = setComputeUnitPrice(this.umi, {
          microLamports: 10000_000,
        })
          .add(setComputeUnitLimit(this.umi, { units: 80000 }))
          .add(addConfigLineBuilder);

        builder = builder.prepend({
          instruction: advanceNonceInstruction,
          signers: [this.umi.identity],
          bytesCreatedOnChain: 0,
        });
        builder = builder.setBlockhash(nonceArgs.nonce);
        const tx = await builder.buildAndSign(this.umi);
        val = await this.sendTx(tx, nonceArgs);
        await this.nonceService.updateNonce(new PublicKey(nonceArgs.address));
      }

      count += 8;
    }
  }

  async sendTx(tx: UmiTransaction, nonceArgs: NonceAccountArgs, depth = 0) {
    if (depth == 30) {
      return false;
    }
    const signature = await umi.rpc.sendTransaction(tx, {
      commitment: 'confirmed',
      maxRetries: 0,
      skipPreflight: true,
    });
    await sleep(15000);
    let status: TransactionStatus[];
    try {
      status = await umi.rpc.getSignatureStatuses([signature], {
        searchTransactionHistory: true,
      });
    } catch (e) {
      return this.sendTx(tx, nonceArgs, depth + 1);
    }

    console.log(status);
    if (
      status.at(0) &&
      (status.at(0).commitment === 'confirmed' ||
        status.at(0).commitment === 'finalized')
    ) {
      return true;
    }
    console.log(
      `${depth} time retrying transaction: ${base58.deserialize(signature)[0]}`,
    );
    return this.sendTx(tx, nonceArgs, depth + 1);
  }
}
