import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UserComic } from '@prisma/client';
import { ComicStats } from './types/comic-stats';
import { PickByType } from '../types/shared';

@Injectable()
export class UserComicService {
  constructor(private readonly prisma: PrismaService) {}

  async getComicStats(comicSlug: string): Promise<ComicStats> {
    const aggregate = this.prisma.userComic.aggregate({
      where: { comicSlug, rating: { not: null } },
      _avg: { rating: true },
      _count: true,
    });

    const countFavourites = this.prisma.userComic.count({
      where: { comicSlug, isFavourite: true },
    });

    const countViewers = this.prisma.userComic.count({
      where: { comicSlug, viewedAt: { not: null } },
    });

    const countIssues = this.prisma.comicIssue.count({
      where: {
        deletedAt: null,
        publishedAt: { lt: new Date() },
        verifiedAt: { not: null },
        comicSlug,
      },
    });

    const countReaders = this.prisma.userComicIssue.count({
      where: { comicIssue: { comicSlug }, readAt: { not: null } },
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

  getUserStats(slug: string, userId?: number): Promise<UserComic> {
    if (!userId) return undefined;

    return this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug: slug } },
      create: {
        userId,
        comicSlug: slug,
        viewedAt: new Date(),
      },
      update: { viewedAt: new Date() },
    });
  }

  rate(userId: number, comicSlug: string, rating: number) {
    return this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug } },
      create: { userId, comicSlug, rating },
      update: { rating },
    });
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
}
