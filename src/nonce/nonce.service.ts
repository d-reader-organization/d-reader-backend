import { Injectable } from '@nestjs/common';
import {
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { PrismaService } from 'nestjs-prisma';
import {
  getConnection,
  getIdentitySignature,
  getTreasuryPublicKey,
} from '../utils/metaplex';
import { MIN_COMPUTE_PRICE_IX } from '../constants';
import { NonceAccountArgs } from './types';
import { DurableNonce, DurableNonceStatus } from '@prisma/client';

@Injectable()
export class NonceService {
  private readonly connection: Connection;
  constructor(private readonly prisma: PrismaService) {
    this.connection = getConnection();
  }

  // Create durable nonce accounts in batch
  async create(supply: number) {
    const nonceAccounts: NonceAccountArgs[] = [];

    for (let i = 0; i < supply; i++) {
      try {
        const accounts = await this.createNonce();
        nonceAccounts.push(accounts);
        console.log(`${i + 1} Nonce account created`);
      } catch (e) {
        console.error(`Failed to create a nonce`, e);
      }
    }

    await this.prisma.durableNonce.createMany({
      data: nonceAccounts,
    });
  }

  async fetchNonceAccount(address: PublicKey) {
    const nonceInfo = await this.connection.getAccountInfo(address, {
      commitment: 'confirmed',
    });
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
      signedTransaction.partialSign(nonceKey);

      const rawTransaction = signedTransaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
      });

      const signature = await this.connection.sendRawTransaction(
        rawTransaction,
      );
      await this.connection.confirmTransaction(
        {
          signature,
          ...latestBlockhash,
        },
        'confirmed',
      );

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
      const rawTransaction = signedTransaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
      });
      const signature = await this.connection.sendRawTransaction(
        rawTransaction,
      );
      await this.connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      });

      console.log(`Advanced nonce ${address.toString()}`);

      await this.updateNonce(address);
    } catch (e) {
      console.error(`Failed to advance nonce ${address}`);
    }
  }

  async updateNonce(address: PublicKey) {
    const nonceData = await this.fetchNonceAccount(address);
    await this.prisma.durableNonce.update({
      where: { address: address.toString() },
      data: {
        nonce: nonceData.nonce,
        status: DurableNonceStatus.Available,
        lastUpdatedAt: new Date(),
      },
    });
  }

  async getNonce(depth = 0): Promise<DurableNonce> {
    const nonce = await this.prisma.durableNonce.findFirst({
      where: { status: DurableNonceStatus.Available },
    });

    if (!nonce) return;

    const updatedNonce = await this.prisma.durableNonce.update({
      where: { address: nonce.address, status: nonce.status },
      data: { status: DurableNonceStatus.InUse, lastUpdatedAt: new Date() },
    });

    if (depth == 6) {
      return;
    } else if (!updatedNonce) {
      return this.getNonce(depth + 1);
    }

    return updatedNonce;
  }
}
