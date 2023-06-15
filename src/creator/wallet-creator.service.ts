import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatorStats } from '../comic/types/creator-stats';
import { mockPromise, getRandomFloatOrInt } from '../utils/helpers';
import { WalletCreatorStats } from './types/my-stats';

@Injectable()
export class WalletCreatorService {
  constructor(private readonly prisma: PrismaService) {}
  async toggleFollow(
    walletAddress: string,
    creatorSlug: string,
  ): Promise<boolean> {
    // TODO: https://github.com/prisma/prisma/discussions/2531
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
      const getStats = this.aggregateCreatorStats(slug);
      const getWalletStats = this.walletCreatorStats(slug, walletAddress);

      const [stats, myStats] = await Promise.all([getStats, getWalletStats]);
      return { stats, myStats };
    } else {
      return { stats: await this.aggregateCreatorStats(slug) };
    }
  }

  async aggregateCreatorStats(slug: string): Promise<CreatorStats> {
    const countFollowers = this.prisma.walletCreator.count({
      where: { creatorSlug: slug, isFollowing: true },
    });

    const countComicIssues = this.prisma.comicIssue.count({
      where: { comic: { creator: { slug } } },
    });

    const calculateTotalVolume = mockPromise(getRandomFloatOrInt(1, 1000));

    const [followersCount, comicIssuesCount, totalVolume] = await Promise.all([
      countFollowers,
      countComicIssues,
      calculateTotalVolume,
    ]);

    return { followersCount, comicIssuesCount, totalVolume };
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
