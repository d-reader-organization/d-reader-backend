import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
  transferTokens,
} from '@metaplex-foundation/mpl-toolbox';
import { encodeUmiTransaction } from '../utils/transactions';
import { AddressLookupTableAccount } from '@solana/web3.js';
import { TransactionMessage } from '@solana/web3.js';
import { VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  FUNDS_DESTINATION_ADDRESS,
  MIN_COMPUTE_PRICE,
  SOL_ADDRESS,
  USDC_ADDRESS,
} from '../constants';
import { BadRequestException, Injectable } from '@nestjs/common';
import { publicKey, createNoopSigner } from '@metaplex-foundation/umi';
import { Umi } from '@metaplex-foundation/umi';
import { PrismaService } from 'nestjs-prisma';
import { getConnection, umi } from '../utils/metaplex';
import { Connection } from '@solana/web3.js';
import { isNull } from 'lodash';

@Injectable()
export class InvestService {
  private readonly connection: Connection;
  private readonly umi: Umi;

  constructor(private readonly prisma: PrismaService) {
    this.umi = umi;
    this.connection = getConnection();
  }

  async createExpressInterestTransaction(
    walletAddress: string,
    projectId: number,
    userId: number,
    splTokenAddress: string,
  ) {
    if (splTokenAddress !== SOL_ADDRESS && splTokenAddress !== USDC_ADDRESS) {
      throw new BadRequestException('Currency not supported!');
    }

    const isUserAlreadyInvested =
      await this.prisma.userInterestedReceipt.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
    if (isUserAlreadyInvested) {
      throw new BadRequestException('User already expressed interest !');
    }

    const isSol = splTokenAddress === SOL_ADDRESS;
    const mint = publicKey(splTokenAddress);
    const wallet = publicKey(walletAddress);

    const solPrice = 0.006;
    const usdcPrice = 1;

    const signer = createNoopSigner(wallet);
    const fundsTreasury = publicKey(FUNDS_DESTINATION_ADDRESS);
    const amount = isSol
      ? solPrice * LAMPORTS_PER_SOL
      : usdcPrice * Math.pow(10, 6);

    const source = isSol
      ? wallet
      : findAssociatedTokenPda(this.umi, { mint, owner: wallet });
    const destination = isSol
      ? fundsTreasury
      : findAssociatedTokenPda(this.umi, { mint, owner: fundsTreasury });

    const transferTransaction = await setComputeUnitPrice(this.umi, {
      microLamports: MIN_COMPUTE_PRICE,
    })
      .add(transferTokens(this.umi, { source, destination, amount }))
      .buildAndSign({ ...this.umi, payer: signer });

    return encodeUmiTransaction(transferTransaction);
  }

  async expressUserInterest(
    transactionSignature: string,
    projectId: number,
    userId: number,
  ) {
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(transactionSignature, 'base64'),
    );

    let lookupTableAccounts: AddressLookupTableAccount;
    if (transaction.message.addressTableLookups.length) {
      const lookupTableAddress =
        transaction.message.addressTableLookups[0].accountKey;

      const lookupTable = await this.connection.getAddressLookupTable(
        lookupTableAddress,
      );
      lookupTableAccounts = lookupTable.value;
    }

    const instructions = TransactionMessage.decompile(transaction.message, {
      addressLookupTableAccounts: lookupTableAccounts
        ? [lookupTableAccounts]
        : [],
    });

    const baseInstruction = instructions.instructions.at(-1);
    const address = baseInstruction.keys[0].pubkey.toString();

    await this.prisma.userInterestedReceipt.create({
      data: {
        transactionSignature,
        projectId,
        timestamp: new Date(),
        wallet: {
          connectOrCreate: {
            where: { address },
            create: { address },
          },
        },
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  async findAllInvestProjects() {
    const query = await this.prisma.userInterestedReceipt.groupBy({
      by: ['projectId'],
      _count: {
        projectId: true,
      },
      orderBy: {
        projectId: 'asc',
      },
    });

    const projectInterestCounts = query.map((arg) => ({
      id: arg.projectId,
      count: arg._count.projectId,
    }));
    return projectInterestCounts;
  }

  async findOneInvestProject(projectId: number, userId?: number) {
    const query = userId
      ? await this.prisma.userInterestedReceipt.findUnique({
          where: { projectId_userId: { projectId, userId } },
        })
      : null;

    const countOfUserExpressedInterest =
      await this.prisma.userInterestedReceipt.count({ where: { projectId } });
    return { countOfUserExpressedInterest, isInvested: !isNull(query) };
  }
}
