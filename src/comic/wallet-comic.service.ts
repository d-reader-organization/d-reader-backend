import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { WalletComic } from '@prisma/client';
import { ComicStats } from './types/comic-stats';
import { PickByType } from 'src/types/shared';

@Injectable()
export class WalletComicService {
  constructor(private prisma: PrismaService) {}

  async aggregateComicStats(slug: string): Promise<ComicStats> {
    const aggregate = this.prisma.walletComic.aggregate({
      where: { comicSlug: slug, rating: { not: null } },
      _avg: { rating: true },
      _count: true,
    });

    const countFavourites = this.prisma.walletComic.count({
      where: { comicSlug: slug, isFavourite: true },
    });

    const countSubscribers = this.prisma.walletComic.count({
      where: { comicSlug: slug, isSubscribed: true },
    });

    const countViewers = this.prisma.walletComic.count({
      where: {
        comicSlug: slug,
        viewedAt: {
          not: null,
        },
      },
    });

    const countIssues = this.prisma.comicIssue.count({
      where: {
        deletedAt: null,
        publishedAt: { lt: new Date() },
        verifiedAt: { not: null },
        comicSlug: slug,
      },
    });

    // TODO: distinct
    const countReaders = this.prisma.walletComicIssue.count({
      where: { comicIssue: { comicSlug: slug }, readAt: { not: null } },
      // distinct: ['walletAddress'],
    });

    try {
      const [
        aggregations,
        favouritesCount,
        subscribersCount,
        issuesCount,
        readersCount,
        viewersCount,
      ] = await Promise.all([
        aggregate,
        countFavourites,
        countSubscribers,
        countIssues,
        countReaders,
        countViewers,
      ]);

      return {
        averageRating: aggregations._avg.rating,
        ratersCount: aggregations._count,
        favouritesCount: favouritesCount,
        subscribersCount: subscribersCount,
        issuesCount: issuesCount,
        readersCount: readersCount,
        viewersCount: viewersCount,
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async findWalletComicStats(
    slug: string,
    walletAddress: string,
  ): Promise<WalletComic> {
    const walletComic = await this.prisma.walletComic.findUnique({
      where: {
        comicSlug_walletAddress: {
          walletAddress,
          comicSlug: slug,
        },
      },
    });

    if (!walletComic) {
      return {
        comicSlug: slug,
        walletAddress,
        rating: null,
        isSubscribed: false,
        isFavourite: false,
        isWhitelisted: false,
        viewedAt: null,
      };
    } else return walletComic;
  }

  async aggregateAll(slug: string, walletAddress?: string) {
    if (walletAddress) {
      const getStats = this.aggregateComicStats(slug);
      const getWalletStats = this.findWalletComicStats(slug, walletAddress);

      const [stats, myStats] = await Promise.all([getStats, getWalletStats]);
      return { stats, myStats };
    } else {
      return { stats: await this.aggregateComicStats(slug) };
    }
  }

  async rate(walletAddress: string, comicSlug: string, rating: number) {
    const walletComic = await this.prisma.walletComic.upsert({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
      create: { walletAddress, comicSlug, rating },
      update: { rating },
    });

    return walletComic;
  }

  async toggleState(
    walletAddress: string,
    comicSlug: string,
    property: keyof PickByType<WalletComic, boolean>,
  ) {
    let walletComic = await this.prisma.walletComic.findUnique({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
    });

    walletComic = await this.prisma.walletComic.upsert({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
      create: { walletAddress, comicSlug, [property]: true },
      update: { [property]: !walletComic?.[property] },
    });

    return walletComic;
  }

  async refreshDate(
    walletAddress: string,
    comicSlug: string,
    property: keyof PickByType<WalletComic, Date>,
  ) {
    return await this.prisma.walletComic.upsert({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
      create: {
        walletAddress,
        comicSlug,
        [property]: new Date(),
      },
      update: { [property]: new Date() },
    });
  }
}
