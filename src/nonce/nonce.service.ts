import { Metaplex } from '@metaplex-foundation/js';
import { Injectable } from '@nestjs/common';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import { initMetaplex } from '../utils/metaplex';
import { decodeTransaction } from '../utils/transactions';
import { NonceAccountStatus } from '@prisma/client';
import { NonceAccountArgs } from './types';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NonceService {
  private readonly transactionQueues: { [queueName: string]: Transaction[] } =
    {};
  private readonly metaplex: Metaplex;

  constructor(private readonly prisma: PrismaService) {
    this.metaplex = initMetaplex();
  }

  createQueue(queueName: string) {
    if (this.transactionQueues[queueName]) {
      throw new Error(`Queue with name ${queueName} already exists`);
    }
    this.transactionQueues[queueName] = [];
  }

  closeQueue(queueName: string) {
    delete this.transactionQueues[queueName];
  }

  async addTransaction(queueName: string, serializedTx: string) {
    if (!this.transactionQueues[queueName]) {
      throw new Error(`Queue '${queueName}' does not exist.`);
    }
    const transaction = decodeTransaction(serializedTx);
    this.transactionQueues[queueName].push(transaction);
  }

  async processTransactions(queueName: string) {
    while (this.transactionQueues[queueName].length) {
      const transaction = this.transactionQueues[queueName].shift();
      const nonce = transaction.recentBlockhash;
      const nonceAccount = await this.prisma.nonceAccount.findFirst({
        where: { nonce },
      });
      if (!nonceAccount) {
        console.error(`Invalid nonce token ${transaction.recentBlockhash}`);
        continue;
      }
      try {
        const tx = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
        const signature = await sendAndConfirmRawTransaction(
          this.metaplex.connection,
          tx,
        );
        console.log('signature:', signature);
      } catch (e) {
        // handle retry transaction
        console.log(e);
      } finally {
        const nonceInfo = await this.metaplex.connection.getAccountInfo(
          new PublicKey(nonceAccount.address),
        );
        const nonceAccountData = NonceAccount.fromAccountData(nonceInfo.data);
        await this.prisma.nonceAccount.update({
          where: { nonce },
          data: {
            nonce: nonceAccountData.nonce,
            status: NonceAccountStatus.Available,
          },
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processTransactionQueues() {
    console.log('Processing Transactions');
    for (const key in this.transactionQueues) {
      console.log(key);
      await this.processTransactions(key);
    }
  }

  async updateNonce(serializedTx: string, isCancelled?: boolean) {
    const transaction = decodeTransaction(serializedTx);
    const nonce = transaction.recentBlockhash;
    let newNonce: string;
    if (!isCancelled) {
      const nonceAccount = await this.prisma.nonceAccount.findFirst({
        where: { nonce },
      });
      newNonce = (await this.fetchNewNonce(new PublicKey(nonceAccount.address)))
        .nonce;
    }
    await this.prisma.nonceAccount.update({
      where: { nonce },
      data: {
        status: NonceAccountStatus.Available,
        nonce: newNonce,
      },
    });
  }

  async updateMultipleNonce(serializedTxs: string[], isCancelled?: boolean) {
    for (const tx of serializedTxs) {
      await this.updateNonce(tx, isCancelled);
    }
  }

  async fetchNewNonce(address: PublicKey) {
    const nonceInfo = await this.metaplex.connection.getAccountInfo(address);
    return NonceAccount.fromAccountData(nonceInfo.data);
  }

  async allocateNonceAccount(supply: number) {
    const nonceAccounts = await this.prisma.nonceAccount.findMany({
      where: { status: NonceAccountStatus.Available },
      take: supply,
    });
    await this.prisma.nonceAccount.updateMany({
      where: {
        address: { in: nonceAccounts.map((account) => account.address) },
      },
      data: {
        status: NonceAccountStatus.Loaded,
      },
    });
    return nonceAccounts;
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
      const nonceAccount = await this.fetchNewNonce(nonceKey.publicKey);

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
    const totalNonce: NonceAccountArgs[] = [];
    for (let i = 0; i < supply; i++) {
      const nonceArgs = await this.createNonceAccount();
      totalNonce.push(nonceArgs);
    }
    await this.prisma.nonceAccount.createMany({ data: totalNonce });
  }
}
