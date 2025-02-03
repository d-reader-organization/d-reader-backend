import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatorStats } from '../comic/dto/types';
import { UserCreatorMyStatsDto } from './dto/types';
import {
  ActivityTargetType,
  CreatorActivityFeedType,
  UserCreator,
} from '@prisma/client';
import { PickByType } from 'src/types/shared';
import { CreatorFilterParams } from './dto/creator-params.dto';
import { CreatorInput } from './dto/creator.dto';
import { isNull } from 'lodash';
import { ERROR_MESSAGES } from '../utils/errors';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { ActivityNotificationType } from 'src/websockets/dto/activity-notification.dto';

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
}
