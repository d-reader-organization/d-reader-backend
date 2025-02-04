import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatorStats } from '../comic/dto/types';
import { UserCreatorMyStatsDto } from './dto/types';
import {
  ActivityTargetType,
  ComicIssueSnapshotType,
  ComicSnapshotType,
  CreatorActivityFeedType,
  CreatorSnapshotType,
  UserCreator,
} from '@prisma/client';
import { PickByType } from 'src/types/shared';
import { CreatorFilterParams } from './dto/creator-params.dto';
import { CreatorInput } from './dto/creator.dto';
import { isNull } from 'lodash';
import { ERROR_MESSAGES } from '../utils/errors';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { ActivityNotificationType } from 'src/websockets/dto/activity-notification.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subHours } from 'date-fns';

@Injectable()
export class UserCreatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebSocketGateway,
  ) {}

  async getCreatorStats(id: number): Promise<CreatorStats> {
    const countFollowers = this.prisma.userCreator.count({
      where: { creatorId: id, followedAt: { not: null } },
    });

    const countComicIssues = this.prisma.comicIssue.count({
      where: {
        comic: { creator: { id } },
        publishedAt: { not: null },
        verifiedAt: { not: null },
      },
    });

    const calculateTotalVolume = this.getTotalCreatorVolume(id);

    const [followersCount, comicIssuesCount, totalVolume] = await Promise.all([
      countFollowers,
      countComicIssues,
      calculateTotalVolume,
    ]);

    return { followersCount, comicIssuesCount, totalVolume };
  }

  async getTotalCreatorVolume(id: number) {
    const getSecondaryVolume = this.prisma.auctionSale.aggregate({
      where: {
        listing: {
          digitalAsset: {
            collectibleComic: {
              metadata: {
                collection: { comicIssue: { comic: { creator: { id } } } },
              },
            },
          },
        },
      },
      _sum: { price: true },
    });

    const getPrimaryVolume = this.prisma.candyMachineReceipt.aggregate({
      where: {
        collectibleComics: {
          every: {
            metadata: {
              collection: { comicIssue: { comic: { creator: { id } } } },
            },
          },
        },
      },
      _sum: { price: true },
    });

    const [primarySalesVolume, secondarySalesVolume] = await Promise.all([
      getSecondaryVolume,
      getPrimaryVolume,
    ]);

    const primaryVolume = primarySalesVolume._sum?.price || 0;
    const secondaryVolume = secondarySalesVolume._sum?.price || 0;
    const totalVolume = Number(primaryVolume) + Number(secondaryVolume);
    return totalVolume;
  }

  async getUserStats(
    id: number,
    userId?: number,
  ): Promise<UserCreatorMyStatsDto> {
    if (!userId) return undefined;

    const userCreator = await this.prisma.userCreator.findUnique({
      where: { creatorId_userId: { userId, creatorId: id } },
    });

    const isFollowing = !isNull(userCreator) ? !!userCreator.followedAt : false;
    return { isFollowing };
  }

  async follow(userId: number, creatorId: number) {
    const userCreator = await this.toggleDate(userId, creatorId, 'followedAt');
    const creator = await this.prisma.creatorChannel.findUnique({
      where: { id: creatorId },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const targetId = creatorId.toString();
    this.prisma.creatorActivityFeed
      .create({
        data: {
          creator: { connect: { id: creatorId } },
          type: CreatorActivityFeedType.CreatorFollow,
          targetType: ActivityTargetType.Creator,
          targetId,
          user: { connect: { id: userId } },
        },
      })
      .catch((e) =>
        ERROR_MESSAGES.FAILED_TO_INDEX_ACTIVITY(
          targetId,
          CreatorActivityFeedType.CreatorFollow,
          e,
        ),
      );

    this.websocketGateway.handleActivityNotification({
      user,
      type: ActivityNotificationType.CreatorFollow,
      targetId,
      targetTitle: creator.handle,
    });

    return userCreator;
  }

  async toggleDate(
    userId: number,
    creatorId: number,
    property: keyof PickByType<UserCreator, Date>,
  ): Promise<UserCreator> {
    const userCreator = await this.prisma.userCreator.findUnique({
      where: {
        creatorId_userId: { userId, creatorId },
      },
    });

    // if date is existing, remove it, otherwise add a new date
    const updatedDate = !!userCreator?.[property] ? null : new Date();

    return await this.prisma.userCreator.upsert({
      where: { creatorId_userId: { userId, creatorId } },
      create: { creatorId, userId, [property]: new Date() },
      update: { [property]: updatedDate },
    });
  }

  async getCreatorsFollowedByUser({
    userId,
    query,
  }: {
    userId: number;
    query: CreatorFilterParams;
  }): Promise<CreatorInput[]> {
    const creators = (
      await this.prisma.userCreator.findMany({
        where: {
          userId,
          followedAt: {
            not: null,
          },
        },
        include: {
          creator: true,
        },
        skip: query.skip,
        take: query.take,
      })
    ).map((userCreator) => userCreator.creator);

    return await Promise.all(
      creators.map(async (creator) => {
        const followersCountQuery = this.prisma.userCreator.count({
          where: {
            creatorId: creator.id,
            followedAt: {
              not: null,
            },
          },
        });
        const comicCountsQuery = this.prisma.comic.count({
          where: {
            creatorId: creator.id,
          },
        });
        const [followersCount, comicsCount] = await Promise.all([
          followersCountQuery,
          comicCountsQuery,
        ]);

        return {
          ...creator,
          stats: {
            followersCount,
            comicsCount,
            comicIssuesCount: 0,
            totalVolume: 0,
          },
        };
      }),
    );
  }

  async getPrimarySale(creatorId: number) {
    // only index those candymachines that are not deleted or it has been less than 24 hours from deletion
    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    const candymachines = await this.prisma.candyMachine.findMany({
      where: {
        deletedAt: {
          not: { lt: lastSnapshotDate },
        },
        collection: { comicIssue: { comic: { creatorId } } },
      },
      select: {
        address: true,
        coupons: {
          select: {
            currencySettings: { select: { label: true, usdcEquivalent: true } },
          },
        },
      },
    });

    if (!candymachines || candymachines.length == 0) return 0;

    const keys = candymachines.flatMap((candymachine) =>
      candymachine.coupons.flatMap((coupon) =>
        coupon.currencySettings.map((setting) => ({
          label: setting.label,
          usdcEquivalent: setting.usdcEquivalent,
          candyMachineAddress: candymachine.address,
        })),
      ),
    );

    let sales = 0;
    for await (const key of keys) {
      const { candyMachineAddress, usdcEquivalent, label } = key;
      const totalItemsMinted = await this.prisma.candyMachineReceipt.aggregate({
        where: { candyMachineAddress, label },
        _sum: { numberOfItems: true },
      });

      sales += usdcEquivalent * (totalItemsMinted?._sum?.numberOfItems || 0);
    }

    return sales;
  }

  async getIssueFavouriteCount(comicIssueId: number) {
    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    return this.prisma.userComicIssue.count({
      where: { comicIssueId, favouritedAt: { gt: lastSnapshotDate } },
    });
  }

  async getIssueReaderCount(comicIssueId: number) {
    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    return this.prisma.userComicIssue.count({
      where: { comicIssueId, readAt: { gt: lastSnapshotDate } },
    });
  }

  async getIssueViewerCount(comicIssueId: number) {
    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    return this.prisma.userComicIssue.count({
      where: { comicIssueId, viewedAt: { gt: lastSnapshotDate } },
    });
  }

  async getComicFavouriteCount(comicSlug: string) {
    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    return this.prisma.userComic.count({
      where: { comicSlug, favouritedAt: { gt: lastSnapshotDate } },
    });
  }

  async getComicBookmarkCount(comicSlug: string) {
    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    return this.prisma.userComic.count({
      where: { comicSlug, bookmarkedAt: { gt: lastSnapshotDate } },
    });
  }

  async getComicViewerCount(comicSlug: string) {
    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    return this.prisma.userComic.count({
      where: { comicSlug, viewedAt: { gt: lastSnapshotDate } },
    });
  }

  async getComicIssueData(creatorId: number) {
    const issues = await this.prisma.comicIssue.findMany({
      where: { comic: { creatorId }, verifiedAt: { not: null } },
    });
    let likes = 0,
      readers = 0,
      views = 0;

    for await (const issue of issues) {
      const comicIssueId = issue.id;
      const countFavourites = this.getIssueFavouriteCount(comicIssueId);
      const countReaders = this.getIssueReaderCount(comicIssueId);
      const countViewers = this.getIssueViewerCount(comicIssueId);

      const [favouritesCount, readersCount, viewersCount] = await Promise.all([
        countFavourites,
        countReaders,
        countViewers,
      ]);

      this.prisma.comicIssueSnapshot
        .createMany({
          data: [
            {
              comicIssueId,
              type: ComicIssueSnapshotType.Like,
              value: favouritesCount,
            },
            {
              comicIssueId,
              type: ComicIssueSnapshotType.Reader,
              value: readersCount,
            },
            {
              comicIssueId,
              type: ComicIssueSnapshotType.View,
              value: viewersCount,
            },
          ],
        })
        .catch((e) =>
          ERROR_MESSAGES.FAILED_TO_TAKE_SNAPSHOT(
            comicIssueId.toString(),
            'comicIssue',
            e,
          ),
        );

      likes += favouritesCount;
      readers += readersCount;
      views += viewersCount;
    }

    return { likes, readers, views };
  }

  async getComicData(creatorId: number) {
    const comics = await this.prisma.comic.findMany({
      where: { creatorId, verifiedAt: { not: null } },
    });
    let likes = 0,
      bookmarks = 0,
      views = 0;

    for await (const comic of comics) {
      const comicSlug = comic.slug;
      const countFavourites = this.getComicFavouriteCount(comicSlug);
      const countBookmarks = this.getComicBookmarkCount(comicSlug);
      const countViewers = this.getComicViewerCount(comicSlug);

      const [favouriteCount, bookmarkCount, viewerCount] = await Promise.all([
        countFavourites,
        countBookmarks,
        countViewers,
      ]);

      this.prisma.comicSnapshot
        .createMany({
          data: [
            {
              comicSlug,
              type: ComicSnapshotType.Like,
              value: favouriteCount,
            },
            {
              comicSlug,
              type: ComicSnapshotType.Bookmark,
              value: bookmarkCount,
            },
            {
              comicSlug,
              type: ComicSnapshotType.View,
              value: viewerCount,
            },
          ],
        })
        .catch((e) =>
          ERROR_MESSAGES.FAILED_TO_TAKE_SNAPSHOT(comicSlug, 'comic', e),
        );

      likes += favouriteCount;
      bookmarks += bookmarkCount;
      views += viewerCount;
    }

    return { likes, bookmarks, views };
  }

  //TODO: Add royalties data
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async snapshot() {
    const creators = await this.prisma.creatorChannel.findMany({
      where: { verifiedAt: { not: null } },
    });

    const now = new Date();
    const lastSnapshotDate = subHours(now, 24);

    for await (const creator of creators) {
      const creatorId = creator.id;

      const countFollowers = this.prisma.userCreator.count({
        where: { creatorId: creator.id, followedAt: { gt: lastSnapshotDate } },
      });
      const getComicIssueData = this.getComicIssueData(creatorId);
      const getComicData = this.getComicData(creatorId);
      const getPrimarySaleData = this.getPrimarySale(creatorId);

      const [followerCount, comicData, comicIssueData, primarySales] =
        await Promise.all([
          countFollowers,
          getComicData,
          getComicIssueData,
          getPrimarySaleData,
        ]);

      this.prisma.creatorSnapshot
        .createMany({
          data: [
            {
              creatorId,
              type: CreatorSnapshotType.Follower,
              value: followerCount,
            },
            {
              creatorId,
              type: CreatorSnapshotType.Bookmark,
              value: comicData.bookmarks,
            },
            {
              creatorId,
              type: CreatorSnapshotType.Like,
              value: comicData.likes + comicIssueData.likes,
            },
            {
              creatorId,
              type: CreatorSnapshotType.Reader,
              value: comicIssueData.readers,
            },
            {
              creatorId,
              type: CreatorSnapshotType.View,
              value: comicData.views + comicIssueData.views,
            },
            {
              creatorId,
              type: CreatorSnapshotType.Sale,
              value: primarySales,
            },
          ],
        })
        .catch((e) =>
          ERROR_MESSAGES.FAILED_TO_TAKE_SNAPSHOT(
            creatorId.toString(),
            'creator',
            e,
          ),
        );
    }
  }
}
