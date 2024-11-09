import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
  transferSol,
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
import {
  publicKey,
  createNoopSigner,
  lamports,
} from '@metaplex-foundation/umi';
import { Umi } from '@metaplex-foundation/umi';
import { PrismaService } from 'nestjs-prisma';
import { getConnection, umi } from '../utils/metaplex';
import { Connection } from '@solana/web3.js';
import { isNull } from 'lodash';
import { ProjectInput } from './dto/project.dto';

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
    projectSlug: string,
    userId: number,
    splTokenAddress: string,
  ) {
    if (splTokenAddress !== SOL_ADDRESS && splTokenAddress !== USDC_ADDRESS) {
      throw new BadRequestException('Currency not supported!');
    }

    const isUserAlreadyInvested =
      await this.prisma.userInterestedReceipt.findUnique({
        where: { projectSlug_userId: { projectSlug, userId } },
      });
    if (isUserAlreadyInvested) {
      throw new BadRequestException("You've already expressed interest!");
    }

    const isSol = splTokenAddress === SOL_ADDRESS;
    const mint = publicKey(splTokenAddress);
    const wallet = publicKey(walletAddress);

    const solPrice = 0.005;
    const usdcPrice = 1;

    const signer = createNoopSigner(wallet);
    const fundsTreasury = publicKey(FUNDS_DESTINATION_ADDRESS);

    if (isSol) {
      const amount = solPrice * LAMPORTS_PER_SOL;
      const transferTransaction = await setComputeUnitPrice(this.umi, {
        microLamports: MIN_COMPUTE_PRICE,
      })
        .add(
          transferSol(this.umi, {
            source: signer,
            destination: fundsTreasury,
            amount: lamports(amount),
          }),
        )
        .buildAndSign({ ...this.umi, payer: signer });

      return encodeUmiTransaction(transferTransaction);
    } else {
      const amount = usdcPrice * Math.pow(10, 6);
      const source = findAssociatedTokenPda(this.umi, { mint, owner: wallet });
      const destination = findAssociatedTokenPda(this.umi, {
        mint,
        owner: fundsTreasury,
      });

      const transferTransaction = await setComputeUnitPrice(this.umi, {
        microLamports: MIN_COMPUTE_PRICE,
      })
        .add(transferTokens(this.umi, { source, destination, amount }))
        .buildAndSign({ ...this.umi, payer: signer });
      return encodeUmiTransaction(transferTransaction);
    }
  }

  async expressUserInterest(
    expressInterestTransaction: string,
    projectSlug: string,
    expressedAmount: number,
    userId: number,
  ) {
    try {
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(expressInterestTransaction, 'base64'),
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

      const latestBlockhash = await this.connection.getLatestBlockhash({
        commitment: 'confirmed',
      });
      const transactionSignature = await this.connection.sendTransaction(
        transaction,
      );
      await this.connection.confirmTransaction({
        ...latestBlockhash,
        signature: transactionSignature,
      });

      await this.prisma.userInterestedReceipt.create({
        data: {
          transactionSignature,
          projectSlug,
          timestamp: new Date(),
          expressedAmount,
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
    } catch (e) {
      console.error('Failed to send transaction to express interest', e);
    }
  }

  async findAllInvestProjects(): Promise<ProjectInput[]> {
    const query = await this.prisma.userInterestedReceipt.groupBy({
      by: ['projectSlug'],
      _count: {
        projectSlug: true,
      },
      orderBy: {
        projectSlug: 'asc',
      },
    });

    const projectInterestCounts = query.map((arg) => ({
      slug: arg.projectSlug,
      countOfUserExpressedInterest: arg._count.projectSlug,
    }));
    return projectInterestCounts;
  }

  async findOneInvestProject(
    projectSlug: string,
    userId?: number,
  ): Promise<ProjectInput> {
    const query = userId
      ? await this.prisma.userInterestedReceipt.findUnique({
          where: { projectSlug_userId: { projectSlug, userId } },
        })
      : null;

    const data = await this.prisma.userInterestedReceipt.aggregate({
      where: { projectSlug },
      _count: { id: true },
      _sum: { expressedAmount: true },
    });
    return {
      slug: projectSlug,
      countOfUserExpressedInterest: data?._count?.id || 0,
      expectedPledgedAmount: data?._sum?.expressedAmount || 0,
      isUserInterested: !isNull(query),
    };
  }

  async findUserInterestedReceipts(projectSlug: string) {
    const receipts = await this.prisma.userInterestedReceipt.findMany({
      where: { projectSlug },
      include: { user: true },
      orderBy: { timestamp: 'asc' },
    });
    return receipts;
  }
}
