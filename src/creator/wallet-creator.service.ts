import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { WalletCreatorStats } from './types/my-stats';

@Injectable()
export class WalletCreatorService {
  constructor(private readonly prisma: PrismaService) {}
  async follow(walletAddress: string, creatorSlug: string): Promise<boolean> {
    let walletCreator = await this.prisma.walletCreator.findUnique({
      where: {
        creatorSlug_walletAddress: { walletAddress, creatorSlug },
      },
    });

    walletCreator = await this.prisma.walletCreator.upsert({
      where: { creatorSlug_walletAddress: { walletAddress, creatorSlug } },
      create: { creatorSlug, walletAddress, isFollowing: true },
      update: { isFollowing: !walletCreator?.isFollowing },
    });
    return !!walletCreator;
  }

  async walletCreatorStats(
    slug: string,
    walletAddress: string,
  ): Promise<WalletCreatorStats> {
    const walletCreator = await this.prisma.walletCreator.findUnique({
      where: {
        creatorSlug_walletAddress: {
          walletAddress,
          creatorSlug: slug,
        },
      },
    });
    return { isFollowing: walletCreator?.isFollowing ?? false };
  }
}
