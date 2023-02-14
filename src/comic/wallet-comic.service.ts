import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { WalletComic } from '@prisma/client';
import {
  getRandomFloatOrInt,
  getRandomInt,
  mockPromise,
} from 'src/utils/helpers';
import { ComicStats } from './types/comic-stats';

@Injectable()
export class WalletComicService {
  constructor(private prisma: PrismaService) {}

  async aggregateComicStats(slug: string): Promise<ComicStats> {
    const aggregateQuery = this.prisma.walletComic.aggregate({
      where: { comicSlug: slug },
      _avg: { rating: true },
    });

    const countRatersQuery = this.prisma.walletComic.count({
      where: { comicSlug: slug, isFavourite: true },
    });

    const countFavouritesQuery = this.prisma.walletComic.count({
      where: { comicSlug: slug, isFavourite: true },
    });

    const countSubscribersQuery = this.prisma.walletComic.count({
      where: { comicSlug: slug, isFavourite: true },
    });

    const countIssuesQuery = this.prisma.comicIssue.count({
      where: {
        deletedAt: null,
        publishedAt: { lt: new Date() },
        verifiedAt: { not: null },
        comicSlug: slug,
      },
    });

    // TODO: total number of unique readers across all comic issues
    const countReadersQuery = mockPromise(0);
    // TODO: total number of unique viewers across all comic issues
    const countViewersQuery = mockPromise(0);
    // TODO: total volume of all comic issues and collectibles
    const calculateTotalVolumeQuery = mockPromise(0);

    // TODO: try catch
    const [
      aggregations,
      ratersCount,
      favouritesCount,
      subscribersCount,
      issuesCount,
      readersCount,
      viewersCount,
      totalVolume,
    ] = await Promise.all([
      aggregateQuery,
      countRatersQuery,
      countFavouritesQuery,
      countSubscribersQuery,
      countIssuesQuery,
      countReadersQuery,
      countViewersQuery,
      calculateTotalVolumeQuery,
    ]);

    return {
      averageRating: aggregations._avg.rating || getRandomFloatOrInt(2, 5),
      ratersCount: ratersCount || getRandomInt(1, 60),
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

  async toggleAction({
    walletAddress,
    comicSlug,
    payload,
  }: {
    walletAddress: string;
    comicSlug: string;
    payload: Record<string, boolean | Date>;
  }) {
    let walletComic = await this.prisma.walletComic.findUnique({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
    });
    if (!walletComic) {
      return null;
    }

    const [payloadKey, payloadValue] = Object.entries(payload).at(0);
    const updatePayload =
      typeof payloadValue === 'boolean'
        ? {
          [payloadKey]: !walletComic[payloadKey],
          }
        : payload;

    walletComic = await this.prisma.walletComic.upsert({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
      create: { walletAddress, comicSlug, ...payload },
      update: updatePayload,
    });

    return walletComic;
  }
}
