import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatorStats } from 'src/comic/types/creator-stats';
import { WalletCreatorStats } from './types/my-stats';

@Injectable()
export class WalletCreatorService {
  constructor(private readonly prisma: PrismaService) {}
  async toggleFollow(walletAddress: string, creatorSlug: string): Promise<boolean> {
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

  async aggregateAll(slug: string, walletAddress?: string) {
    if (walletAddress) {
      const getStatsPromise = this.aggregateCreatorStats(slug);
      const getWalletStatsPromise = this.walletCreatorStats(
        slug,
        walletAddress,
      );

      const [stats, myStats] = await Promise.all([
        getStatsPromise,
        getWalletStatsPromise,
      ]);
      return { stats, myStats };
    } else {
      return { stats: await this.aggregateCreatorStats(slug) };
    }
  }

  async aggregateCreatorStats(slug: string): Promise<CreatorStats> {
    const countFollowersQuery = this.prisma.walletCreator.count({
      where: { creatorSlug: slug, isFollowing: true },
    });

    const [followersCount] = await Promise.all([countFollowersQuery]);

    return { followersCount, comicIssuesCount: 5, totalVolume: 125 };
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
