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
      where: { comicSlug, favouritedAt: { not: null } },
    });

    // const countBookmarks = this.prisma.userComic.count({
    //   where: { comicSlug, bookmarkedAt: { not: null } },
    // });

    // const countSubscribers = this.prisma.userComic.count({
    //   where: { comicSlug, subscribedAt: { not: null } },
    // });

    const countViewers = this.prisma.userComic.count({
      where: { comicSlug, viewedAt: { not: null } },
    });

    const countIssues = this.prisma.comicIssue.count({
      where: {
        publishedAt: { not: null },
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
        // bookmarksCount,
        // subscribersCount,
        issuesCount,
        readersCount,
        viewersCount,
      ] = await Promise.all([
        aggregate,
        countFavourites,
        // countBookmarks,
        // countSubscribers,
        countIssues,
        countReaders,
        countViewers,
      ]);

      return {
        readersCount,
        favouritesCount,
        // bookmarksCount,
        // subscribersCount,
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

  async rate(userId: number, comicSlug: string, rating: number) {
    return this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug } },
      create: { userId, comicSlug, rating },
      update: { rating },
    });
  }

  async toggleDate(
    userId: number,
    comicSlug: string,
    property: keyof PickByType<UserComic, Date>,
  ): Promise<UserComic> {
    const userComic = await this.prisma.userComic.findUnique({
      where: { comicSlug_userId: { userId, comicSlug } },
    });

    // if date is existing, remove it, otherwise add a new date
    const updatedDate = !!userComic?.[property] ? null : new Date();

    return await this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug } },
      create: { userId, comicSlug, [property]: new Date() },
      update: { [property]: updatedDate },
    });
  }
}
