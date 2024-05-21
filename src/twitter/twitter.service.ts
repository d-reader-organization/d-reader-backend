import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { getComicMintTweetContent } from 'src/utils/helpers';

@Injectable()
export class TwitterService {
  constructor(private readonly prisma: PrismaService) {}

  async getTwitterIntentComicMinted(comicAddress: string, utmSource: string) {
    const { collection, ...metadata } = await this.prisma.metadata.findFirst({
      where: { asset: { some: { address: comicAddress } } },
      include: {
        collection: {
          include: {
            comicIssue: {
              include: {
                statelessCovers: true,
                comic: { include: { creator: true } },
              },
            },
          },
        },
      },
    });
    const { comicIssue } = collection;
    const statelessCover = comicIssue.statelessCovers.find(
      (cover) => cover.rarity === metadata.rarity,
    );

    const tweet = getComicMintTweetContent(
      comicIssue.comic,
      comicIssue,
      metadata,
      utmSource,
      comicIssue.comic.creator.twitter,
      statelessCover.artistTwitterHandle,
    );
    return tweet;
  }
}
