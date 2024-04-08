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
import { chunk, update } from 'lodash';
import { NonceAccountArgs } from './types';
import { DurableNonceStatus } from '@prisma/client';

@Injectable()
export class NonceService {
  private readonly connection: Connection;
  constructor(private readonly prisma: PrismaService) {
    this.connection = getConnection();
  }

  // Create durable nonce accounts in batch
  async create(supply: number) {
    const nonceAccounts: NonceAccountArgs[] = [];
    const createNoncePromises = Array(supply).map(this.createNonce);

    const NONCE_CHUNK_LEN = 5;
    const promiseChunks = chunk(createNoncePromises, NONCE_CHUNK_LEN);

    let failedCount = 0;
    for await (const promise of promiseChunks) {
      try {
        const accounts = await Promise.all(promise);
        nonceAccounts.concat(accounts);
      } catch (e) {
        failedCount += 1;
        console.error(`Failed to create nonce, Failed Count : ${failedCount}`);
      }
    }
    await this.prisma.durableNonce.createMany({ data: nonceAccounts });
  }

  async fetchNonceAccount(address: PublicKey) {
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

      const lamports = await this.connection.getMinimumBalanceForRentExemption(
        NONCE_ACCOUNT_LENGTH,
      );
      transaction.add(
        MIN_COMPUTE_PRICE_IX,
        SystemProgram.createAccount({
          fromPubkey: identity,
          newAccountPubkey: nonceKey.publicKey,
          lamports,
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
      const nonceAccount = await this.fetchNonceAccount(nonceKey.publicKey);

      return {
        nonce: nonceAccount.nonce,
        address: nonceKey.publicKey.toString(),
      };
    } catch (e) {
      console.log(e);
    }
  }

  async advanceNonce(address: PublicKey) {
    try {
      const identity = getTreasuryPublicKey();
      const latestBlockhash = await this.connection.getLatestBlockhash(
        'confirmed',
      );
      const transaction = new Transaction({
        ...latestBlockhash,
        feePayer: identity,
      });
      transaction.add(
        MIN_COMPUTE_PRICE_IX,
        SystemProgram.nonceAdvance({
          authorizedPubkey: identity,
          noncePubkey: address,
        }),
      );
      const signedTransaction = getIdentitySignature(transaction);
      await sendAndConfirmTransaction(this.connection, signedTransaction, []);
      console.log(`Advanced nonce ${address.toString()}`);

      const nonceData = await this.fetchNonceAccount(address);
      await this.prisma.durableNonce.update({
        where: { address: address.toString() },
        data: { nonce: nonceData.nonce, status: DurableNonceStatus.Available },
      });
    } catch (e) {
      console.error(`Failed to advance nonce ${address}`);
    }
  }

  async getNonce(depth = 0) {
    const nonce = await this.prisma.durableNonce.findFirst({
      where: { status: DurableNonceStatus.Available },
    });

    if (!nonce) return;

    const updatedNonce = await this.prisma.durableNonce.update({
      where: { address: nonce.address, status: nonce.status },
      data: { status: DurableNonceStatus.InUse },
    });

    if (depth == 6) {
      return;
    } else if (!updatedNonce) {
      return this.getNonce(depth + 1);
    }

    return updatedNonce;
  }
}
