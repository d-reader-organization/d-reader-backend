import { Injectable } from '@nestjs/common';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  getConnection,
  getIdentitySignature,
  getTreasuryPublicKey,
} from '../utils/metaplex';
import { MIN_COMPUTE_PRICE_IX } from '../constants';
import { chunk } from 'lodash';
import { NonceAccountArgs } from './types';

@Injectable()
export class NonceService {
  private readonly connection: Connection;
  constructor(private readonly prisma: PrismaService) {
    this.connection = getConnection();
  }

  // Create durable nonce accounts in batch
  async create(supply: number) {
    const nonceAccounts: NonceAccountArgs[] = [];
    const createNoncePromises = Array(supply).map(() => this.createNonce());

    const NONCE_CHUNK_LEN = 5;
    const promiseChunks = chunk(createNoncePromises, NONCE_CHUNK_LEN);

    let failedCount = 0;
    for await (const promise of promiseChunks) {
      try {
        const nonceAccount = await Promise.all(promise);
        nonceAccounts.concat(nonceAccount);
      } catch (e) {
        failedCount += 1;
        console.error(`Failed to create nonce, Failed Count : ${failedCount}`);
      }
    }
    await this.prisma.durableNonce.createMany({ data: nonceAccounts });
  }

  async fetchNewNonce(address: PublicKey) {
    const nonceInfo = await this.connection.getAccountInfo(address);
    return NonceAccount.fromAccountData(nonceInfo.data);
  }

  async createNonce(): Promise<NonceAccountArgs> {
    const nonceKey = Keypair.generate();
    const identity = getTreasuryPublicKey();
    try {
      const latestBlockhash = await this.connection.getLatestBlockhash(
        'confirmed',
      );
      const transaction = new Transaction({
        ...latestBlockhash,
        feePayer: identity,
      });

      transaction.add(
        MIN_COMPUTE_PRICE_IX,
        SystemProgram.createAccount({
          fromPubkey: identity,
          newAccountPubkey: nonceKey.publicKey,
          // TODO: Calculate lamports based on nonce account rent
          lamports: 0.0015 * LAMPORTS_PER_SOL,
          space: NONCE_ACCOUNT_LENGTH,
          programId: SystemProgram.programId,
        }),
        SystemProgram.nonceInitialize({
          noncePubkey: nonceKey.publicKey,
          authorizedPubkey: identity,
        }),
      );

      const signedTransaction = getIdentitySignature(transaction);
      await sendAndConfirmTransaction(this.connection, signedTransaction, [
        nonceKey,
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
}
