import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UserComic } from '@prisma/client';
import { ComicStats } from './types/comic-stats';
import { PickByType } from '../types/shared';

@Injectable()
export class UserComicService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateComicStats(slug: string): Promise<ComicStats> {
    const aggregate = this.prisma.userComic.aggregate({
      where: { comicSlug: slug, rating: { not: null } },
      _avg: { rating: true },
      _count: true,
    });

    const countFavourites = this.prisma.userComic.count({
      where: { comicSlug: slug, isFavourite: true },
    });

    const countViewers = this.prisma.userComic.count({
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

    const countReaders = this.prisma.userComicIssue.count({
      where: { comicIssue: { comicSlug: slug }, readAt: { not: null } },
      // distinct: ['userId'],
    });

    try {
      const [
        aggregations,
        favouritesCount,
        issuesCount,
        readersCount,
        viewersCount,
      ] = await Promise.all([
        aggregate,
        countFavourites,
        countIssues,
        countReaders,
        countViewers,
      ]);

      return {
        readersCount,
        favouritesCount,
        issuesCount,
        viewersCount,
        averageRating: aggregations._avg.rating,
        ratersCount: aggregations._count,
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async findUserComicStats(slug: string, userId: number): Promise<UserComic> {
    const userComic = await this.prisma.userComic.findUnique({
      where: { comicSlug_userId: { userId, comicSlug: slug } },
    });

    if (!userComic) {
      return {
        comicSlug: slug,
        userId,
        rating: null,
        isSubscribed: false,
        isFavourite: false,
        isWhitelisted: false,
        viewedAt: null,
      };
    } else return userComic;
  }

  async aggregateAll(slug: string, userId?: number) {
    if (userId) {
      const getStats = this.aggregateComicStats(slug);
      const getUserStats = this.findUserComicStats(slug, userId);

      const [stats, myStats] = await Promise.all([getStats, getUserStats]);
      return { stats, myStats };
    } else {
      return { stats: await this.aggregateComicStats(slug) };
    }
  }

  async rate(userId: number, comicSlug: string, rating: number) {
    const userComic = await this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug } },
      create: { userId, comicSlug, rating },
      update: { rating },
    });

    return userComic;
  }

  async toggleState(
    userId: number,
    comicSlug: string,
    property: keyof PickByType<UserComic, boolean>,
  ) {
    let userComic = await this.prisma.userComic.findUnique({
      where: { comicSlug_userId: { userId, comicSlug } },
    });

    userComic = await this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug } },
      create: { userId, comicSlug, [property]: true },
      update: { [property]: !userComic?.[property] },
    });

    return userComic;
  }

  async refreshDate(
    userId: number,
    comicSlug: string,
    property: keyof PickByType<UserComic, Date>,
  ) {
    return await this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug } },
      create: {
        userId,
        comicSlug,
        [property]: new Date(),
      },
      update: { [property]: new Date() },
    });
  }
}
