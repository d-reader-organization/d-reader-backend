import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { WalletComic } from '@prisma/client';
import {
  getRandomFloatOrInt,
  getRandomInt,
  mockPromise,
} from 'src/utils/helpers';
import { ComicStats } from './types/comic-stats';
import { PickByType } from 'src/types/shared';

@Injectable()
export class WalletComicService {
  constructor(private prisma: PrismaService) {}

  async aggregateComicStats(slug: string): Promise<ComicStats> {
    const aggregateQuery = this.prisma.walletComic.aggregate({
      where: { comicSlug: slug },
      _avg: { rating: true },
      _count: true,
    });

    const countFavouritesQuery = this.prisma.walletComic.count({
      where: { comicSlug: slug, isFavourite: true },
    });

    const countSubscribersQuery = this.prisma.walletComic.count({
      where: { comicSlug: slug, isSubscribed: true },
    });

    const countViewersQuery = this.prisma.walletComic.count({
      where: {
        comicSlug: slug,
        viewedAt: {
          not: null,
        },
      },
    });

    const countIssuesQuery = this.prisma.comicIssue.count({
      where: {
        deletedAt: null,
        publishedAt: { lt: new Date() },
        verifiedAt: { not: null },
        comicSlug: slug,
      },
    });

    // TODO: Once when WalletComicIssue is there
    const countReadersQuery = mockPromise(0);
    // TODO: total volume of all comic issues and collectibles
    const calculateTotalVolumeQuery = mockPromise(0);

    // TODO: try catch
    const [
      aggregations,
      favouritesCount,
      subscribersCount,
      issuesCount,
      readersCount,
      viewersCount,
      totalVolume,
    ] = await Promise.all([
      aggregateQuery,
      countFavouritesQuery,
      countSubscribersQuery,
      countIssuesQuery,
      countReadersQuery,
      countViewersQuery,
      calculateTotalVolumeQuery,
    ]);

    return {
      averageRating: aggregations._avg.rating || getRandomFloatOrInt(2, 5),
      ratersCount: aggregations._count || getRandomInt(1, 60),
      favouritesCount: favouritesCount || getRandomInt(1, 3000),
      subscribersCount: subscribersCount || getRandomInt(1, 1000),
      issuesCount: issuesCount || getRandomInt(1, 20),
      readersCount: readersCount || getRandomInt(1, 7000),
      viewersCount: viewersCount || getRandomInt(1, 20000),
      totalVolume: totalVolume || getRandomFloatOrInt(1, 1000),
    };
  }

  async findWalletComicStats(
    slug: string,
    walletAddress: string,
  ): Promise<WalletComic | null> {
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
      const getStatsPromise = this.aggregateComicStats(slug);
      const getWalletStatsPromise = this.findWalletComicStats(
        slug,
        walletAddress,
      );

      const [stats, myStats] = await Promise.all([
        getStatsPromise,
        getWalletStatsPromise,
      ]);
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
    if (!walletComic) {
      return null;
    }

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
      where: {
        comicSlug_walletAddress: { walletAddress, comicSlug },
      },
      create: {
        walletAddress,
        comicSlug,
        [property]: new Date().toISOString(),
      },
      update: { [property]: new Date().toISOString() },
    });
  }
}
