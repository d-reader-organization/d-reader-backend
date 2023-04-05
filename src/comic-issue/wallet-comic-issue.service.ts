import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PickByType } from '../types/shared';
import { WalletComicIssue } from '@prisma/client';
import { ComicIssueStats } from '../comic/types/comic-issue-stats';
import { ComicIssue } from '@prisma/client';

@Injectable()
export class WalletComicIssueService {
  constructor(private prisma: PrismaService) {}

  async aggregateComicIssueStats(
    issue: ComicIssue & { collectionNft: { address: string } },
  ): Promise<ComicIssueStats> {
    const aggregate = this.prisma.walletComicIssue.aggregate({
      where: { comicIssueId: issue.id, rating: { not: null } },
      _avg: { rating: true },
      _count: true,
    });

    const countFavourites = this.prisma.walletComicIssue.count({
      where: { comicIssueId: issue.id, isFavourite: true },
    });

    const countReaders = this.prisma.walletComicIssue.count({
      where: { comicIssueId: issue.id, readAt: { not: null } },
    });

    const countViewers = this.prisma.walletComicIssue.count({
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
    // TODO: double check this
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

  async findWalletComicIssueStats(
    comicIssueId: number,
    walletAddress: string,
  ): Promise<WalletComicIssue> {
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
    issue: ComicIssue & { collectionNft: { address: string } },
    walletAddress?: string,
  ) {
    if (walletAddress) {
      const getStats = this.aggregateComicIssueStats(issue);
      const getWalletStats = this.findWalletComicIssueStats(
        issue.id,
        walletAddress,
      );

      const [stats, myStats] = await Promise.all([getStats, getWalletStats]);
      return { stats, myStats };
    } else {
      return { stats: await this.aggregateComicIssueStats(issue) };
    }
  }

  async shouldShowPreviews(
    comicIssueId: number,
    walletAddress: string,
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
    const ownedComicIssues = await this.prisma.nft.findMany({
      where: { collectionNftAddress, ownerAddress: walletAddress },
    });

    // if wallet does not own the issue, see if it's whitelisted per comic issue basis
    if (!ownedComicIssues.length) {
      const walletComicIssue = await this.prisma.walletComicIssue.findFirst({
        where: { walletAddress, comicIssueId, isWhitelisted: true },
      });

      // if wallet does not own the issue, see if it's whitelisted per comic basis
      if (!walletComicIssue) {
        const walletComic = await this.prisma.walletComic.findFirst({
          where: {
            walletAddress,
            comic: { issues: { some: { id: comicIssueId } } },
            isWhitelisted: true,
          },
        });

        // if wallet is still not allowed to view the full content of the issue
        // make sure to show only preview pages of the comic
        if (!walletComic) return true;
      }
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
      where: { comicIssueId_walletAddress: { walletAddress, comicIssueId } },
      create: {
        walletAddress,
        comicIssueId,
        [property]: new Date(),
      },
      update: { [property]: new Date() },
    });
  }
}
