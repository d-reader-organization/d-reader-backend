import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { WalletComic } from '@prisma/client';
import { mockPromise } from 'src/utils/helpers';
import { ComicStats } from './types/comic-stats';

@Injectable()
export class WalletComicService {
  constructor(private prisma: PrismaService) {}

  // async aggregateComicStatsSerial(slug: string): Promise<ComicStats> {
  //   // TODO: try catch
  //   const aggregations = await this.prisma.walletComic.aggregate({
  //     where: { comicSlug: slug },
  //     _avg: { rating: true },
  //   });
  //   const averageRating = aggregations._avg.rating;

  //   const favouritesCount = await this.prisma.walletComic.count({
  //     where: { comicSlug: slug, isFavourite: true },
  //   });

  //   const subscribersCount = await this.prisma.walletComic.count({
  //     where: { comicSlug: slug, isFavourite: true },
  //   });

  //   const ratersCount = await this.prisma.walletComic.count({
  //     where: { comicSlug: slug, isFavourite: true },
  //   });

  //   const issuesCount = await this.prisma.comicIssue.count({
  //     where: {
  //       deletedAt: null,
  //       publishedAt: { lt: new Date() },
  //       verifiedAt: { not: null },
  //       comicSlug: slug,
  //     },
  //   });

  //   // TODO: total volume of all comic issues and collectibles
  //   const totalVolume = 72.2;
  //   // TODO: total number of unique readers across all comic issues
  //   const readersCount = 1349; // TODO
  //   // TODO: total number of unique viewers across all comic issues
  //   const viewersCount = 4221; // TODO

  //   return {
  //     favouritesCount,
  //     subscribersCount,
  //     ratersCount,
  //     averageRating,
  //     issuesCount,
  //     totalVolume,
  //     readersCount,
  //     viewersCount,
  //   };
  // }

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
    const countReadersQuery = mockPromise(1349);
    // TODO: total number of unique viewers across all comic issues
    const countViewersQuery = mockPromise(4221);
    // TODO: total volume of all comic issues and collectibles
    const calculateTotalVolumeQuery = mockPromise(72.2);

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
      averageRating: aggregations._avg.rating,
      ratersCount,
      favouritesCount,
      subscribersCount,
      issuesCount,
      readersCount,
      viewersCount,
      totalVolume,
    };
  }

  async findWalletComicStats(
    walletAddress: string,
    slug: string,
  ): Promise<WalletComic | null> {
    const walletComic = await this.prisma.walletComic.findUnique({
      where: {
        comicSlug_walletAddress: {
          walletAddress: walletAddress,
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
      return {
        stats: await this.aggregateComicStats(slug),
        myStats: null,
      };
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

  async toggleSubscribe(walletAddress: string, comicSlug: string) {
    let walletComic = await this.prisma.walletComic.findUnique({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
    });

    walletComic = await this.prisma.walletComic.upsert({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
      create: { walletAddress, comicSlug, isSubscribed: true },
      update: { isSubscribed: !walletComic?.isSubscribed },
    });

    return walletComic;
  }

  async toggleFavourite(walletAddress: string, comicSlug: string) {
    let walletComic = await this.prisma.walletComic.findUnique({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
    });

    walletComic = await this.prisma.walletComic.upsert({
      where: { comicSlug_walletAddress: { walletAddress, comicSlug } },
      create: { walletAddress, comicSlug, isFavourite: true },
      update: { isFavourite: !walletComic?.isFavourite },
    });

    return walletComic;
  }
}
