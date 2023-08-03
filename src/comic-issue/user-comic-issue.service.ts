import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PickByType } from '../types/shared';
import { UserComicIssue } from '@prisma/client';
import { ComicIssueStats } from '../comic/types/comic-issue-stats';
import { ComicIssue } from '@prisma/client';

@Injectable()
export class UserComicIssueService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateComicIssueStats(
    issue: ComicIssue & { collectionNft: { address: string } },
  ): Promise<ComicIssueStats> {
    const aggregate = this.prisma.userComicIssue.aggregate({
      where: { comicIssueId: issue.id, rating: { not: null } },
      _avg: { rating: true },
      _count: true,
    });

    const countFavourites = this.prisma.userComicIssue.count({
      where: { comicIssueId: issue.id, isFavourite: true },
    });

    const countReaders = this.prisma.userComicIssue.count({
      where: { comicIssueId: issue.id, readAt: { not: null } },
    });

    const countViewers = this.prisma.userComicIssue.count({
      where: { comicIssueId: issue.id, viewedAt: { not: null } },
    });

    const countIssues = this.prisma.comicIssue.count({
      where: { comicSlug: issue.comicSlug },
    });

    const countTotalPages = this.prisma.comicPage.count({
      where: { comicIssueId: issue.id },
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
      ] = await Promise.all([
        aggregate,
        countFavourites,
        countReaders,
        countViewers,
        countIssues,
        getPrice,
        countTotalPages,
      ]);

      return {
        favouritesCount,
        readersCount,
        viewersCount,
        totalIssuesCount,
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
    // if comic is not a web3 collection the price is 0
    if (issue.supply === 0) return issue.mintPrice;

    // if comic is a web3 collection price is equal to the base price
    // from the active CandyMachine
    const activeCandyMachine = await this.prisma.candyMachine.findFirst({
      where: {
        collectionNft: { comicIssueId: issue.id },
        itemsRemaining: { gt: 0 },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { baseMintPrice: true },
    });

    if (activeCandyMachine) return activeCandyMachine.baseMintPrice;

    // if there is no active candy machine, look for cheapest price on the marketplace
    const cheapestItem = await this.prisma.listing.findFirst({
      where: {
        nft: { collectionNft: { comicIssueId: issue.id } },
        canceledAt: new Date(0),
      },
      orderBy: { price: 'asc' },
      select: { price: true },
    });

    if (!cheapestItem) return null;
    return cheapestItem.price;
  }

  async findUserComicIssueStats(
    comicIssueId: number,
    userId: number,
  ): Promise<UserComicIssue> {
    const userComic = await this.prisma.userComicIssue.findUnique({
      where: { comicIssueId_userId: { userId, comicIssueId } },
    });

    if (!userComic) {
      return {
        comicIssueId,
        userId,
        rating: null,
        isFavourite: false,
        isSubscribed: false,
        isWhitelisted: false,
        viewedAt: null,
        readAt: null,
      };
    } else return userComic;
  }

  async aggregateAll(
    issue: ComicIssue & { collectionNft: { address: string } },
    userId?: number,
  ) {
    if (userId) {
      const getStats = this.aggregateComicIssueStats(issue);
      const getUserStats = this.findUserComicIssueStats(issue.id, userId);

      const [stats, myStats] = await Promise.all([getStats, getUserStats]);
      return { stats, myStats };
    } else {
      return { stats: await this.aggregateComicIssueStats(issue) };
    }
  }

  async shouldShowPreviews(
    comicIssueId: number,
    userId: number,
    collectionAddress?: string,
  ): Promise<boolean | undefined> {
    let collectionNftAddress = collectionAddress;
    // if collection NFT address was not provided, make sure it doesn't exist
    if (!collectionAddress) {
      const collectionNft = await this.prisma.collectionNft.findFirst({
        where: { comicIssueId },
      });

      // if comic issue is not an NFT collection it's a FREE web2 comic
      if (!collectionNft) return;
      else collectionNftAddress = collectionNft.address;
    }

    // find all NFTs that token gate the comic issue and are owned by the wallet
    const ownedUsedComicIssueNfts = await this.prisma.nft.findMany({
      where: {
        collectionNftAddress,
        owner: { userId },
        metadata: { isUsed: true }, // only take into account "unwrapped" comics
      },
    });

    if (!ownedUsedComicIssueNfts.length) return true;

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
  }

  async rate(userId: number, comicIssueId: number, rating: number) {
    return await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: { userId, comicIssueId, rating },
      update: { rating },
    });
  }

  async toggleState(
    userId: number,
    comicIssueId: number,
    property: keyof PickByType<UserComicIssue, boolean>,
  ) {
    let userComicIssue = await this.prisma.userComicIssue.findUnique({
      where: { comicIssueId_userId: { userId, comicIssueId } },
    });

    userComicIssue = await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: { userId, comicIssueId, [property]: true },
      update: { [property]: !userComicIssue?.[property] },
    });

    return userComicIssue;
  }

  async refreshDate(
    userId: number,
    comicIssueId: number,
    property: keyof PickByType<UserComicIssue, Date>,
  ) {
    return await this.prisma.userComicIssue.upsert({
      where: { comicIssueId_userId: { userId, comicIssueId } },
      create: {
        userId,
        comicIssueId,
        [property]: new Date(),
      },
      update: { [property]: new Date() },
    });
  }
}
