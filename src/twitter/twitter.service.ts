import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { TWITTER_INTENT } from '../utils/twitter';
import { UtmSource } from './dto/intent-comic-minted-params.dto';
import { removeTwitter } from '../utils/helpers';
import { isEmpty } from 'lodash';
import { processCampaignIdString } from 'src/utils/campaign';
import { ERROR_MESSAGES } from 'src/utils/errors';
import { UserPayload } from 'src/auth/dto/authorization.dto';

@Injectable()
export class TwitterService {
  constructor(private readonly prisma: PrismaService) {}

  async getTwitterIntentComicMinted(
    comicAssetAddress: string,
    utmSource: UtmSource,
  ) {
    const comicAsset = await this.prisma.collectibleComic.findFirst({
      where: { address: comicAssetAddress },
      include: { metadata: true },
    });

    const comicIssue = await this.prisma.comicIssue.findFirst({
      where: {
        collectibleComicCollection: {
          candyMachines: {
            some: { address: comicAsset.candyMachineAddress },
          },
        },
      },
    });

    const comic = await this.prisma.comic.findUnique({
      where: { slug: comicIssue.comicSlug },
    });
    const creator = await this.prisma.creatorChannel.findUnique({
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

    const tweet = TWITTER_INTENT.comicMinted({
      comicTitle: comic.title,
      comicSlug: comic.slug,
      comicIssueTitle: comicIssue.title,
      comicIssueSlug: comicIssue.slug,
      comicAssetRarity: comicAsset.metadata.rarity.toLowerCase(),
      source: utmSource,
      creatorName: creatorTwitterHandle
        ? '@' + creatorTwitterHandle
        : creator.handle,
      coverArtistName: statelessCover.artistTwitterHandle
        ? '@' + statelessCover.artistTwitterHandle
        : statelessCover.artist,
    });
    return tweet;
  }

  async getTwitterIntentIssueSpotlight(id: number) {
    const { comic, ...comicIssue } = await this.prisma.comicIssue.findUnique({
      where: { id },
      include: {
        comic: {
          include: {
            creator: true,
          },
        },
      },
    });

    const isPreviewable = comicIssue.isFreeToRead ? undefined : true;
    const previewPageCount = await this.prisma.comicPage.count({
      where: { comicIssueId: id, isPreviewable },
    });

    const flavorText = isEmpty(comicIssue.flavorText)
      ? comic.flavorText
      : comicIssue.flavorText;
    return TWITTER_INTENT.spotlightComicIssue({
      comicTitle: comic.title,
      creatorTwitter: comic.creator.twitter,
      flavorText,
      creatorHandle: comic.creator.handle,
      previewPageCount,
    });
  }

  async getTwitterIntentExpressedInterest(
    campaignId: string,
    user: UserPayload,
  ) {
    const where = processCampaignIdString(campaignId);
    const { creator, ...campaign } = await this.prisma.campaign.findUnique({
      where,
      include: { creator: true },
    });

    if (!campaign) {
      throw new BadRequestException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({ key: 'slug', value: campaignId }),
      );
    }

    return TWITTER_INTENT.expressedInterest(
      campaign.slug,
      creator,
      user.username,
    );
  }
}
