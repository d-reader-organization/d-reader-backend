import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PickByType } from '../types/shared';
import {
  ActivityTargetType,
  CouponType,
  CreatorActivityFeedType,
  UserComicIssue,
} from '@prisma/client';
import { ComicIssueStats } from '../comic/dto/types';
import { ComicIssue } from '@prisma/client';
import { LOCKED_COLLECTIONS } from '../constants';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { ActivityNotificationType } from 'src/websockets/dto/activity-notification.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class UserComicIssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebSocketGateway,
    private readonly activityService: ActivityService,
  ) {}

  async getFavouriteCount(comicIssueId: number) {
    return this.prisma.userComicIssue.count({
      where: { comicIssueId, favouritedAt: { not: null } },
    });
  }

  async getReaderCount(comicIssueId: number) {
    return this.prisma.userComicIssue.count({
      where: { comicIssueId, readAt: { not: null } },
    });
  }

  async getViewerCount(comicIssueId: number) {
    return this.prisma.userComicIssue.count({
      where: { comicIssueId, viewedAt: { not: null } },
    });
  }

  async getComicIssueStats(comicIssueId: number): Promise<ComicIssueStats> {
    const issue = await this.prisma.comicIssue.findUnique({
      where: { id: comicIssueId },
    });

    if (!issue) return undefined;

    const aggregate = this.prisma.userComicIssue.aggregate({
      where: { comicIssueId, rating: { not: null } },
      _avg: { rating: true },
      _count: true,
    });

    const countFavourites = this.getFavouriteCount(comicIssueId);
    const countReaders = this.getReaderCount(comicIssueId);
    const countViewers = this.getViewerCount(comicIssueId);

    const countIssues = this.prisma.comicIssue.count({
      where: {
        comicSlug: issue.comicSlug,
        verifiedAt: { not: null },
        publishedAt: { not: null },
      },
    });

    const countTotalPages = this.prisma.comicPage.count({
      where: { comicIssueId },
    });

    const countPreviewPages = this.prisma.comicPage.count({
      where: { comicIssueId, isPreviewable: true },
    });

    const getPrice = this.getComicIssuePrice(issue);

    try {
      const [
        aggregations,
        favouritesCount,
        readersCount,
        viewersCount,
        totalIssuesCount,
        price,
        totalPagesCount,
        previewPagesCount,
      ] = await Promise.all([
        aggregate,
        countFavourites,
        countReaders,
        countViewers,
        countIssues,
        getPrice,
        countTotalPages,
        countPreviewPages,
      ]);

      return {
        favouritesCount,
        readersCount,
        viewersCount,
        totalIssuesCount,
        previewPagesCount,
        averageRating: aggregations._avg.rating,
        ratersCount: aggregations._count,
        price,
        totalPagesCount,
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async getComicIssuePrice(issue: ComicIssue): Promise<number | undefined> {
    // if it's a primary sale look for the public mint price
    // else look for the floor price on the auction house if it's a secondary sale

    // if comic is a web3 collection price is equal to the public mint price
    // from the active CandyMachine
    const activeCandyMachine = await this.prisma.candyMachine.findFirst({
      where: {
        collection: { comicIssueId: issue.id },
        itemsRemaining: { gt: 0 },
        coupons: {
          some: {
            type: CouponType.PublicUser,
            expiresAt: { gt: new Date() },
          },
        },
      },
      include: {
        coupons: {
          where: { type: CouponType.PublicUser },
          include: { currencySettings: true },
        },
      },
    });

    if (activeCandyMachine) {
      const solCurrencySettings =
        activeCandyMachine.coupons[0]?.currencySettings.find(
          (currency) =>
            currency.splTokenAddress === WRAPPED_SOL_MINT.toString(),
        );
      const mintPrice = solCurrencySettings?.mintPrice;
      return mintPrice ? Number(mintPrice) : undefined;
    }

    // if there is no active candy machine, look for cheapest price on the marketplace
    const cheapestItem = await this.prisma.listing.findFirst({
      where: {
        digitalAsset: {
          collectibleComic: {
            metadata: { collection: { comicIssueId: issue.id } },
          },
        },
        closedAt: new Date(0),
      },
      orderBy: { price: 'asc' },
      select: { price: true },
    });

    if (!cheapestItem) return null;
    return Number(cheapestItem.price);
  }

  async getAndUpdateUserStats(
    comicIssueId: number,
    userId?: number,
  ): Promise<UserComicIssue> {
    if (typeof userId !== 'number') return undefined;
    const userComicIssueStats = await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: {
        userId,
        comicIssueId,
        viewedAt: new Date(),
      },
      include: { comicIssue: true },
      update: { readAt: new Date() },
    });

    const comicSlug = userComicIssueStats.comicIssue.comicSlug;
    await this.prisma.userComic.upsert({
      where: { comicSlug_userId: { comicSlug, userId } },
      create: {
        userId,
        comicSlug,
        viewedAt: new Date(),
      },
      update: { viewedAt: new Date() },
    });

    return userComicIssueStats;
  }

  /** Can't read full pages if:
   * - not registered (guest mode)
   * - episode is gated and you have no access (e.g. own the NFT)
   */
  async checkCanUserRead(
    comicIssueId: number,
    userId?: number,
  ): Promise<boolean> {
    if (typeof userId !== 'number') return false;

    const { collectibleComicCollection, ...comicIssue } =
      await this.prisma.comicIssue.findUnique({
        where: { id: comicIssueId },
        include: { collectibleComicCollection: true },
      });

    if (comicIssue.isFreeToRead) return true;

    if (collectibleComicCollection) {
      const isCollectionLocked = LOCKED_COLLECTIONS.has(
        collectibleComicCollection.address,
      );

      // find all NFTs that token gate the comic issue and are owned by the wallet
      const ownedUsedComicIssueNfts =
        await this.prisma.collectibleComic.findMany({
          where: {
            metadata: {
              collectionAddress: collectibleComicCollection.address,
              isUsed: isCollectionLocked ? undefined : true,
            }, // only take into account "unwrapped" comics
            digitalAsset: { owner: { userId }, isBurned: false },
          },
        });

      if (ownedUsedComicIssueNfts.length > 0) {
        return true;
      }
    }

    return false;
  }

  async rate(userId: number, comicIssueId: number, rating: number) {
    const userComicIssue = await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: { userId, comicIssueId, rating },
      update: { rating },
      include: {
        user: true,
        comicIssue: { include: { comic: { select: { creatorId: true } } } },
      },
    });

    const { comicIssue, user } = userComicIssue;
    const creatorId = comicIssue.comic.creatorId;
    const targetId = comicIssueId.toString();

    this.activityService.indexCreatorFeedActivity(
      creatorId,
      targetId,
      ActivityTargetType.ComicIssue,
      CreatorActivityFeedType.ComicIssueRated,
      userId,
    );
    this.websocketGateway.handleActivityNotification({
      user,
      type: ActivityNotificationType.ComicIssueRated,
      targetId,
      targetTitle: comicIssue.title,
    });

    return userComicIssue;
  }

  async favourite(userId: number, comicIssueId: number) {
    const userComicIssue = await this.toggleDate(
      userId,
      comicIssueId,
      'favouritedAt',
    );

    if (userComicIssue.favouritedAt) {
      const comicIssue = await this.prisma.comicIssue.findUnique({
        where: { id: comicIssueId },
        include: { comic: { select: { creatorId: true } } },
      });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      const targetId = comicIssueId.toString();
      this.activityService.indexCreatorFeedActivity(
        comicIssue.comic.creatorId,
        targetId,
        ActivityTargetType.ComicIssue,
        CreatorActivityFeedType.ComicIssueLiked,
        userId,
      );

      this.websocketGateway.handleActivityNotification({
        user,
        type: ActivityNotificationType.ComicIssueLiked,
        targetId,
        targetTitle: comicIssue.title,
      });
    }

    return userComicIssue;
  }

  async toggleDate(
    userId: number,
    comicIssueId: number,
    property: keyof PickByType<UserComicIssue, Date>,
  ): Promise<UserComicIssue> {
    const userComicIssue = await this.prisma.userComicIssue.findUnique({
      where: { comicIssueId_userId: { userId, comicIssueId } },
    });

    // if date is existing, remove it, otherwise add a new date
    const updatedDate = !!userComicIssue?.[property] ? null : new Date();

    return await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: { userId, comicIssueId, [property]: new Date() },
      update: { [property]: updatedDate },
    });
  }

  async read(userId: number, comicIssueId: number) {
    return await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: {
        userId,
        comicIssueId,
        readAt: new Date(),
      },
      update: { readAt: new Date() },
    });
  }
}
