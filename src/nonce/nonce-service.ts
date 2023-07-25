import { Metaplex } from '@metaplex-foundation/js';
import { Injectable } from '@nestjs/common';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import { initMetaplex } from '../utils/metaplex';
import { decodeTransaction } from 'src/utils/transactions';
import { NonceAccountStatus } from '@prisma/client';
import { NonceAccountArgs } from './types';

@Injectable()
export class NonceService {
  private queues: { [queueName: string]: Transaction[] } = {};
  private readonly metaplex: Metaplex;

  constructor(private readonly prisma: PrismaService) {
    this.metaplex = initMetaplex();
  }

  createQueue(queueName: string) {
    if (this.queues[queueName]) {
      throw new Error(`Queue with name ${queueName} already exists`);
    }
    this.queues[queueName] = [];
  }

  async addTransaction(queueName: string, serializedTx: string) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue '${queueName}' does not exist.`);
    }
    const transaction = decodeTransaction(serializedTx);
    this.queues[queueName].push(transaction);
  }

  async processTransactions(queueName: string) {
    while (this.queues[queueName].length) {
      const transaction = this.queues[queueName].shift();
      const nonce = transaction.recentBlockhash;
      try {
        await sendAndConfirmTransaction(this.metaplex.connection, transaction, [
          this.metaplex.identity(),
        ]);
      } catch (e) {
        // handle retry transaction
        console.log(e);
      } finally {
        await this.prisma.nonceAccount.update({
          where: { nonce },
          data: {
            status: NonceAccountStatus.Available,
          },
        });
      }
    }
  }

  async processQueues() {
    for (const key in this.queues) {
      if (!this.queues[key]) {
        throw new Error(`Queue '${key}' does not exist.`);
      }
      await this.processTransactions(key);
    }
  }

  async createNonceAccount(): Promise<NonceAccountArgs> {
    const nonceKey = Keypair.generate();
    const identity = this.metaplex.identity();
    try {
      const latestBlockhash = await this.metaplex.connection.getLatestBlockhash(
        'confirmed',
      );
      const tx = new Transaction({
        ...latestBlockhash,
        feePayer: identity.publicKey,
      });
      tx.add(
        SystemProgram.createAccount({
          fromPubkey: identity.publicKey,
          newAccountPubkey: nonceKey.publicKey,
          lamports: 0.0015 * LAMPORTS_PER_SOL,
          space: NONCE_ACCOUNT_LENGTH,
          programId: SystemProgram.programId,
        }),
        SystemProgram.nonceInitialize({
          noncePubkey: nonceKey.publicKey,
          authorizedPubkey: identity.publicKey,
        }),
      );
      await sendAndConfirmTransaction(this.metaplex.connection, tx, [
        nonceKey,
        identity,
      ]);
      const nonceInfo = await this.metaplex.connection.getAccountInfo(
        nonceKey.publicKey,
      );
      const nonceAccount = NonceAccount.fromAccountData(nonceInfo.data);

      return {
        nonce: nonceAccount.nonce,
        address: nonceKey.publicKey.toString(),
      };
    } catch (e) {
      console.log(e);
    }
  }

  // creating 5 nonce accounts in a batch
  async create(supply: number) {
    const iterations = (supply + 4) / 5;
    const totalSupply = supply;
    const totalNonce: NonceAccountArgs[] = [];

    for (let i = 0; i < iterations; i++) {
      const transactionBatch: Promise<NonceAccountArgs>[] = [];
      for (let j = 0; j < Math.min(totalSupply, 5); j++) {
        transactionBatch.push(this.createNonceAccount());
      }
      const nonceBatch = await Promise.all(transactionBatch);
      totalNonce.push(...nonceBatch);
    }
    await this.prisma.nonceAccount.createMany({ data: totalNonce });
  }
}
