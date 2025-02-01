import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  ActivityTargetType,
  CreatorActivityFeedType,
  UserComic,
} from '@prisma/client';
import { ComicStats } from './dto/types';
import { PickByType } from '../types/shared';
import { ERROR_MESSAGES } from '../utils/errors';

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
    if (typeof userId !== 'number') return undefined;

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
    const userComic = await this.prisma.userComic.upsert({
      where: { comicSlug_userId: { userId, comicSlug } },
      create: { userId, comicSlug, rating },
      update: { rating },
      include: { comic: true },
    });

    const creatorId = userComic.comic.creatorId;
    this.prisma.creatorActivityFeed
      .create({
        data: {
          creator: { connect: { id: creatorId } },
          targetId: comicSlug,
          targetType: ActivityTargetType.Comic,
          user: { connect: { id: userId } },
          type: CreatorActivityFeedType.ComicRated,
        },
      })
      .catch((e) =>
        ERROR_MESSAGES.FAILED_TO_INDEX_ACTIVITY(
          comicSlug,
          CreatorActivityFeedType.ComicRated,
          e,
        ),
      );

    return userComic;
  }

  async bookmark(userId: number, comicSlug: string) {
    const userComic = await this.toggleDate(userId, comicSlug, 'bookmarkedAt');
    const comic = await this.prisma.comic.findUnique({
      where: { slug: comicSlug },
    });

    this.prisma.creatorActivityFeed
      .create({
        data: {
          creator: { connect: { id: comic.creatorId } },
          targetType: ActivityTargetType.Comic,
          targetId: comicSlug,
          user: { connect: { id: userId } },
          type: CreatorActivityFeedType.ComicBookmarked,
        },
      })
      .catch((e) =>
        ERROR_MESSAGES.FAILED_TO_INDEX_ACTIVITY(
          comicSlug,
          CreatorActivityFeedType.ComicBookmarked,
          e,
        ),
      );

    return userComic;
  }

  async favouritise(userId: number, comicSlug: string) {
    const userComic = await this.toggleDate(userId, comicSlug, 'favouritedAt');
    const comic = await this.prisma.comic.findUnique({
      where: { slug: comicSlug },
    });

    this.prisma.creatorActivityFeed
      .create({
        data: {
          creator: { connect: { id: comic.creatorId } },
          targetType: ActivityTargetType.Comic,
          targetId: comicSlug,
          user: { connect: { id: userId } },
          type: CreatorActivityFeedType.ComicLiked,
        },
      })
      .catch((e) =>
        ERROR_MESSAGES.FAILED_TO_INDEX_ACTIVITY(
          comicSlug,
          CreatorActivityFeedType.ComicLiked,
          e,
        ),
      );

    return userComic;
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
