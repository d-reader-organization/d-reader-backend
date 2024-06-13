import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  getComicMintTweetContent,
  getIssueSpotlightTweetContent,
} from '../utils/twitter';
import { UtmSource } from './dto/intent-comic-minted-params.dto';
import { removeTwitter } from '../utils/helpers';

@Injectable()
export class TwitterService {
  constructor(private readonly prisma: PrismaService) {}

  async getTwitterIntentComicMinted(
    comicAssetAddress: string,
    utmSource: UtmSource,
  ) {
    const comicAsset = await this.prisma.digitalAsset.findFirst({
      where: { address: comicAssetAddress },
      include: { metadata: true },
    });

    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: {
        collection: {
          candyMachines: {
            some: { address: comicAsset.candyMachineAddress },
          },
        },
      },
    });

    const comic = await this.prisma.comic.findUnique({
      where: { slug: comicIssue.comicSlug },
    });
    const creator = await this.prisma.creator.findUnique({
      where: { id: comic.creatorId },
    });

    const statelessCover = await this.prisma.statelessCover.findUnique({
      where: {
        comicIssueId_rarity: {
          comicIssueId: comicIssue.id,
          rarity: comicAsset.metadata.rarity,
        },
      },
    });

    const creatorTwitterHandle = removeTwitter(creator.twitter);

    const tweet = getComicMintTweetContent({
      comicTitle: comic.title,
      comicSlug: comic.slug,
      comicIssueTitle: comicIssue.title,
      comicIssueSlug: comicIssue.slug,
      comicAssetRarity: comicAsset.metadata.rarity.toLowerCase(),
      source: utmSource,
      creatorName: creatorTwitterHandle
        ? '@' + creatorTwitterHandle
        : creator.name,
      coverArtistName: statelessCover.artistTwitterHandle
        ? '@' + statelessCover.artistTwitterHandle
        : statelessCover.artist,
    });
    return tweet;
  }

  async getTwitterIntentIssueSpotlight(id: number) {
    const { comic, statelessCovers, ...comicIssue } =
      await this.prisma.comicIssue.findUnique({
        where: { id },
        include: {
          comic: {
            include: {
              creator: true,
            },
          },
          statelessCovers: true,
        },
      });

    return getIssueSpotlightTweetContent({
      comicTitle: comic.title,
      comicIssueTitle: comicIssue.title,
      creatorTwitter: comic.creator.twitter,
      creatorName: comic.creator.name,
      coverArtistArray: statelessCovers,
    });
  }
}
