import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PickByType } from '../types/shared';
import { UserComicIssue } from '@prisma/client';
import { ComicIssueStats } from '../comic/types/comic-issue-stats';
import { ComicIssue } from '@prisma/client';
import { LOCKED_COLLECTIONS, PUBLIC_GROUP_LABEL } from '../constants';

@Injectable()
export class UserComicIssueService {
  constructor(private readonly prisma: PrismaService) {}

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

    const countFavourites = this.prisma.userComicIssue.count({
      where: { comicIssueId, favouritedAt: { not: null } },
    });

    const countReaders = this.prisma.userComicIssue.count({
      where: { comicIssueId, readAt: { not: null } },
    });

    const countViewers = this.prisma.userComicIssue.count({
      where: { comicIssueId, viewedAt: { not: null } },
    });

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
        groups: {
          some: {
            label: PUBLIC_GROUP_LABEL,
            endDate: { gt: new Date() },
          },
        },
      },
      include: { groups: { where: { label: PUBLIC_GROUP_LABEL } } },
    });

    if (activeCandyMachine) {
      const mintPrice = activeCandyMachine.groups[0]?.mintPrice;
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

  getUserStats(comicIssueId: number, userId: number): Promise<UserComicIssue> {
    return this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: {
        userId,
        comicIssueId,
        viewedAt: new Date(),
      },
      update: { readAt: new Date() },
    });
  }

  async checkCanUserRead(
    comicIssueId: number,
    userId: number,
  ): Promise<boolean> {
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
            digitalAsset: { owner: { userId } },
          },
        });

      if (ownedUsedComicIssueNfts.length > 0) {
        return true;
      }
    }

    // if wallet does not own the issue, see if the user is whitelisted per comic issue basis
    // if (!ownedUsedComicIssueNfts.length) {
    //   const userComicIssue = await this.prisma.userComicIssue.findFirst({
    //     where: { userId, comicIssueId, isWhitelisted: true },
    //   });

    //   // if user is not whitelisted per comic issue basis, see if it's whitelisted per comic basis
    //   if (!userComicIssue) {
    //     const userComic = await this.prisma.userComic.findFirst({
    //       where: {
    //         userId,
    //         comic: { issues: { some: { id: comicIssueId } } },
    //         isWhitelisted: true,
    //       },
    //     });

    //     // if wallet is still not allowed to view the full content of the issue
    //     // make sure to show only preview pages of the comic
    //     if (!userComic) return true;
    //   }
    // }

    return false;
  }

  async rate(userId: number, comicIssueId: number, rating: number) {
    return await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: { userId, comicIssueId, rating },
      update: { rating },
    });
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
