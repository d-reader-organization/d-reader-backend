import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PickByType } from 'src/types/shared';
import { WalletComicIssue } from '@prisma/client';
import { ComicIssueStats } from 'src/comic/types/comic-issue-stats';
import {
  getRandomFloatOrInt,
  getRandomInt,
  mockPromise,
} from 'src/utils/helpers';

@Injectable()
export class WalletComicIssueService {
  constructor(private prisma: PrismaService) {}

  async aggregateComicIssueStats(
    id: number,
    comicSlug: string,
    candyMachineAddress?: string,
  ): Promise<ComicIssueStats> {
    const aggregateQuery = this.prisma.walletComicIssue.aggregate({
      where: { comicIssueId: id },
      _avg: { rating: true },
      _count: true,
    });

    const countFavouritesQuery = this.prisma.walletComicIssue.count({
      where: { comicIssueId: id, isFavourite: true },
    });

    const countReadersQuery = this.prisma.walletComicIssue.count({
      where: { comicIssueId: id, readAt: { not: null } },
    });

    const countViewersQuery = this.prisma.walletComicIssue.count({
      where: { comicIssueId: id, viewedAt: { not: null } },
    });

    const countIssuesQuery = this.prisma.comicIssue.count({
      where: {
        comicSlug,
      },
    });

    const countTotalPagesQuery = this.prisma.comicPage.count({
      where: {
        comicIssueId: id,
      },
    });

    // TODO: replace with real values
    const calculateTotalVolumeQuery = mockPromise(getRandomFloatOrInt(1, 1000));
    const calculateTotalListedQuery = mockPromise(getRandomInt(6, 14));
    let calculatePriceQuery: Promise<number | { baseMintPrice: number }>;
    if (candyMachineAddress) {
      calculatePriceQuery = this.prisma.candyMachine.findFirst({
        where: {
          address: candyMachineAddress,
        },
        select: { baseMintPrice: true },
      });
    } else {
      calculatePriceQuery = mockPromise(getRandomFloatOrInt(1, 20));
    }

    try {
      const [
        aggregations,
        favouritesCount,
        readersCount,
        viewersCount,
        totalIssuesCount,
        totalVolume,
        _totalListedCount,
        price,
        totalPagesCount,
      ] = await Promise.all([
        aggregateQuery,
        countFavouritesQuery,
        countReadersQuery,
        countViewersQuery,
        countIssuesQuery,
        calculateTotalVolumeQuery,
        calculateTotalListedQuery,
        calculatePriceQuery,
        countTotalPagesQuery,
      ]);

      return {
        favouritesCount,
        readersCount,
        viewersCount,
        totalIssuesCount,
        averageRating: aggregations._avg.rating,
        ratersCount: aggregations._count,
        totalVolume,
        price: typeof price == 'number' ? price : price.baseMintPrice,
        totalPagesCount,
      };
    } catch (error) {
      // TODO: improve catch block
      console.error(error);
      return null;
    }
  }

  async findWalletComicIssueStats(
    comicIssueId: number,
    walletAddress: string,
  ): Promise<WalletComicIssue | null> {
    const walletComic = await this.prisma.walletComicIssue.findUnique({
      where: {
        comicIssueId_walletAddress: {
          walletAddress,
          comicIssueId,
        },
      },
    });

    if (!walletComic) {
      return {
        comicIssueId,
        walletAddress,
        rating: null,
        isFavourite: false,
        isSubscribed: false,
        isWhitelisted: false,
        viewedAt: null,
        readAt: null,
      };
    } else return walletComic;
  }

  async aggregateAll(
    id: number,
    comicSlug: string,
    walletAddress?: string,
    candyMachineAddress?: string,
  ) {
    if (walletAddress) {
      const getStatsPromise = this.aggregateComicIssueStats(
        id,
        comicSlug,
        candyMachineAddress,
      );
      const getWalletStatsPromise = this.findWalletComicIssueStats(
        id,
        walletAddress,
      );

      const [stats, myStats] = await Promise.all([
        getStatsPromise,
        getWalletStatsPromise,
      ]);
      return { stats, myStats };
    } else {
      return { stats: await this.aggregateComicIssueStats(id, comicSlug) };
    }
  }

  async rate(walletAddress: string, comicIssueId: number, rating: number) {
    return await this.prisma.walletComicIssue.upsert({
      where: { comicIssueId_walletAddress: { walletAddress, comicIssueId } },
      create: { walletAddress, comicIssueId, rating },
      update: { rating },
    });
  }

  async toggleState(
    walletAddress: string,
    comicIssueId: number,
    property: keyof PickByType<WalletComicIssue, boolean>,
  ) {
    let walletComicIssue = await this.prisma.walletComicIssue.findUnique({
      where: { comicIssueId_walletAddress: { walletAddress, comicIssueId } },
    });

    walletComicIssue = await this.prisma.walletComicIssue.upsert({
      where: { comicIssueId_walletAddress: { walletAddress, comicIssueId } },
      create: { walletAddress, comicIssueId, [property]: true },
      update: { [property]: !walletComicIssue?.[property] },
    });

    return walletComicIssue;
  }

  async refreshDate(
    walletAddress: string,
    comicIssueId: number,
    property: keyof PickByType<WalletComicIssue, Date>,
  ) {
    return await this.prisma.walletComicIssue.upsert({
      where: {
        comicIssueId_walletAddress: { walletAddress, comicIssueId },
      },
      create: {
        walletAddress,
        comicIssueId,
        [property]: new Date(),
      },
      update: { [property]: new Date() },
    });
  }
}
