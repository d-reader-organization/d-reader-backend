import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ERROR_MESSAGES } from '../utils/errors';
import { insensitive } from '../utils/lodash';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { ActivityNotificationType } from 'src/websockets/dto/activity-notification.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { appendTimestamp } from '../utils/helpers';
import {
  UpdateCampaignDto,
  UpdateCampaignFilesDto,
} from './dto/update-campaign.dto';
import { PickFields } from '../types/shared';
import { Campaign, Prisma } from '@prisma/client';
import { s3Service } from '../aws/s3.service';
import { isEqual, isNil, sortBy } from 'lodash';
import { CampaignInput } from './dto/campaign.dto';
import { CampaignStatsInput } from './dto/campaign-stats.dto';
import {
  CampaignReferralParams,
  ReferredCampaignParams,
} from './dto/campaign-referral-params.dto';
import { PaginatedUserCampaignInterestInput } from './dto/user-campaign-interest.dto';

const getS3Folder = (slug: string) => `comics/${slug}/`;
type ComicFileProperty = PickFields<
  Campaign,
  'cover' | 'banner' | 'info' | 'video'
>;

@Injectable()
export class CampaignService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebSocketGateway,
  ) {}

  async createCampaign(
    creatorId: number,
    createCampaignDto: CreateCampaignDto,
  ) {
    const { genres, title, slug } = createCampaignDto;

    await Promise.all([
      this.throwIfTitleTaken(title),
      this.throwIfSlugTaken(slug),
    ]);

    try {
      const campaign = await this.prisma.campaign.create({
        data: {
          ...createCampaignDto,
          title,
          slug,
          s3BucketSlug: appendTimestamp(slug),
          creator: { connect: { id: creatorId } },
          genres: { connect: genres.map((slug) => ({ slug })) },
        },
      });

      return campaign;
    } catch (e) {
      console.error(e);
      throw new BadRequestException(ERROR_MESSAGES.BAD_CAMPAIGN_DATA);
    }
  }

  async update(slug: string, updateCampaignDto: UpdateCampaignDto) {
    const { genres, slug: newSlug, ...rest } = updateCampaignDto;
    if (newSlug && slug !== newSlug) {
      await this.throwIfSlugTaken(newSlug);
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { slug },
      include: { genres: true },
    });

    const sortedCurrentGenres = sortBy(campaign.genres.map((g) => g.slug));
    const sortedNewGenres = sortBy(genres);
    const areGenresEqual = isEqual(sortedCurrentGenres, sortedNewGenres);

    const areGenresUpdated = !isNil(genres) && !areGenresEqual;

    let genresData: Prisma.CampaignUpdateInput['genres'];
    if (areGenresUpdated) {
      genresData = { set: genres.map((slug) => ({ slug })) };
    }

    try {
      const updatedCampaign = await this.prisma.campaign.update({
        where: { slug },
        data: {
          ...rest,
          ...(newSlug && { slug: newSlug }),
          genres: genresData,
        },
      });
      return updatedCampaign;
    } catch {
      throw new NotFoundException(ERROR_MESSAGES.CAMPAIGN_NOT_FOUND(slug));
    }
  }

  async updateFiles(slug: string, campaignFilesDto: UpdateCampaignFilesDto) {
    const { cover, banner, info, video } = campaignFilesDto;

    let campaign = await this.prisma.campaign.findUnique({ where: { slug } });

    if (!campaign) {
      throw new NotFoundException(ERROR_MESSAGES.CAMPAIGN_NOT_FOUND(slug));
    }

    const newFileKeys: string[] = [];
    const oldFileKeys: string[] = [];

    let coverKey: string, bannerKey: string, infoKey: string, videoKey;
    try {
      const s3Folder = getS3Folder(campaign.s3BucketSlug);
      if (cover) {
        coverKey = await this.s3.uploadFile(cover, {
          s3Folder,
          fileName: 'cover',
        });
        newFileKeys.push(coverKey);
        oldFileKeys.push(campaign.cover);
      }

      if (banner) {
        bannerKey = await this.s3.uploadFile(banner, {
          s3Folder,
          fileName: 'banner',
        });
        newFileKeys.push(bannerKey);
        oldFileKeys.push(campaign.banner);
      }

      if (info) {
        infoKey = await this.s3.uploadFile(info, {
          s3Folder,
          fileName: 'info',
        });
        newFileKeys.push(infoKey);
        oldFileKeys.push(campaign.info);
      }

      if (video) {
        videoKey = await this.s3.uploadFile(video, {
          s3Folder,
          fileName: 'video',
        });
        newFileKeys.push(videoKey);
        oldFileKeys.push(campaign.video);
      }
    } catch {
      await this.s3.garbageCollectNewFiles(newFileKeys, oldFileKeys);
      throw new BadRequestException(ERROR_MESSAGES.MALFORMED_FILE_UPLOAD);
    }

    campaign = await this.prisma.campaign.update({
      where: { slug },
      data: {
        cover: coverKey,
        banner: bannerKey,
        info: infoKey,
        video: videoKey,
      },
    });

    await this.s3.garbageCollectOldFiles(newFileKeys, oldFileKeys);
    return campaign;
  }

  async updateFile(
    slug: string,
    file: Express.Multer.File,
    field: ComicFileProperty,
  ) {
    let campaign: Campaign;
    try {
      campaign = await this.prisma.campaign.findUnique({
        where: { slug },
      });
    } catch {
      throw new NotFoundException(ERROR_MESSAGES.CAMPAIGN_NOT_FOUND(slug));
    }

    const s3Folder = getS3Folder(campaign.s3BucketSlug);
    const oldFileKey = campaign[field];
    const newFileKey = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: field,
    });

    try {
      campaign = await this.prisma.campaign.update({
        where: { slug },
        data: { [field]: newFileKey },
      });
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException(ERROR_MESSAGES.MALFORMED_FILE_UPLOAD);
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return campaign;
  }

  async expressUserInterest(
    campaignSlug: string,
    expressedAmount: number,
    userId: number,
    ref?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { slug: campaignSlug },
    });

    if (!campaign) {
      throw new BadRequestException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND(campaignSlug),
      );
    }

    try {
      const { user } = await this.prisma.userCampaignInterest.upsert({
        where: { campaignSlug_userId: { campaignSlug, userId } },
        include: { user: true },
        update: {
          expressedAmount: Math.min(1000, expressedAmount),
        },
        create: {
          campaign: { connect: { slug: campaignSlug } },
          timestamp: new Date(),
          expressedAmount: Math.min(1000, expressedAmount),
          user: {
            connect: { id: userId },
          },
        },
      });

      this.websocketGateway.handleActivityNotification({
        user,
        type: ActivityNotificationType.ExpressedInterest,
        targetId: campaignSlug,
        targetTitle: campaign.title,
      });

      await this.redeemReferral(ref, userId, campaignSlug);
    } catch (e) {
      throw new BadRequestException(
        ERROR_MESSAGES.FAILED_TO_EXPRESS_INTEREST(campaignSlug),
      );
    }
  }

  async redeemReferral(ref: string, refereeId: number, campaignSlug: string) {
    if (!ref) {
      console.error(ERROR_MESSAGES.REFERRER_NAME_UNDEFINED);
    } else if (!refereeId) {
      throw new BadRequestException(ERROR_MESSAGES.REFEREE_ID_MISSING);
    } else {
      // find the referrer
      const referrer = await this.prisma.user.findFirst({
        where: { username: insensitive(ref) },
      });

      if (!referrer) {
        // handle bad cases
        console.error(`User '${ref}' doesn't exist`);
      } else if (referrer.id === refereeId) {
        throw new BadRequestException('Cannot refer yourself');
      } else {
        // if it's all good so far, apply the referral
        await this.prisma.userCampaignInterest.update({
          where: { id: refereeId, campaignSlug },
          data: { referrerId: referrer.id },
        });
      }
    }
  }

  async findAll(): Promise<CampaignInput[]> {
    const campaigns = await this.prisma.campaign.findMany({});
    return campaigns;
  }

  async findOne(slug: string, userId?: number): Promise<CampaignInput> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { slug },
      include: { genres: true, creator: true, rewards: true },
    });

    if (!campaign) {
      throw new BadRequestException(ERROR_MESSAGES.CAMPAIGN_NOT_FOUND(slug));
    }

    const stats = await this.findStats(slug, userId);
    return { ...campaign, stats };
  }

  async findStats(slug: string, userId?: number): Promise<CampaignStatsInput> {
    const userReceipt = userId
      ? await this.prisma.userCampaignInterest.findUnique({
          where: { campaignSlug_userId: { campaignSlug: slug, userId } },
        })
      : undefined;

    const data = await this.prisma.userCampaignInterest.aggregate({
      where: { campaignSlug: slug },
      _count: { id: true },
      _sum: { expressedAmount: true },
    });

    return {
      numberOfUsersPledged: data?._count?.id || 0,
      expectedPledgedAmount: data?._sum?.expressedAmount || 0,
      userExpressedAmount: userReceipt?.expressedAmount,
    };
  }

  async findReferredCampaigns(
    query: ReferredCampaignParams,
    userId: number,
  ): Promise<CampaignInput[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { backers: { some: { referrerId: userId } } },
      skip: query?.skip,
      take: query?.take,
    });

    return campaigns;
  }

  async findCampaignReferrals(
    query: CampaignReferralParams,
    userId: number,
  ): Promise<PaginatedUserCampaignInterestInput> {
    const receipts = await this.prisma.userCampaignInterest.findMany({
      where: { referrerId: userId },
      include: { user: true },
      skip: query?.skip,
      take: query?.take,
    });

    const totalItems = await this.prisma.userCampaignInterest.count({
      where: { referrerId: userId },
    });

    return { data: receipts, totalItems };
  }

  async findUserCampaignInterestReceipts(campaignSlug: string) {
    const receipts = await this.prisma.userCampaignInterest.findMany({
      where: { campaignSlug },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });
    return receipts;
  }

  async throwIfTitleTaken(title: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { title: insensitive(title) },
    });

    if (campaign)
      throw new BadRequestException(ERROR_MESSAGES.TITLE_TAKEN(title));
  }

  async throwIfSlugTaken(slug: string) {
    const campaign = await this.prisma.comic.findFirst({
      where: { slug: insensitive(slug) },
    });

    if (campaign)
      throw new BadRequestException(ERROR_MESSAGES.SLUG_TAKEN(slug));
  }
}
