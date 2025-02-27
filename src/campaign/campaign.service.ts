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
import { CampaignInput } from './dto/campaign.dto';
import { CampaignStatsInput } from './dto/campaign-stats.dto';
import {
  CampaignReferralParams,
  ReferredCampaignParams,
} from './dto/campaign-referral-params.dto';
import { PaginatedUserCampaignInterestInput } from './dto/user-campaign-interest.dto';
import { processCampaignIdString, selectReward } from 'src/utils/campaign';
import { GuestInterestParams } from './dto/guest-interest-params.dto';
import { AddCampaignRewardDto } from './dto/add-reward.dto';
import { CampaignFilterParamsDto } from './dto/campaign-filter-params.dto';

const getS3Folder = (slug: string) => `campaign/${slug}/`;
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

  async createCampaign(userId: number, createCampaignDto: CreateCampaignDto) {
    const { title, slug } = createCampaignDto;

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
          creator: { connect: { userId } },
        },
      });

      return campaign;
    } catch (e) {
      console.error(e);
      throw new BadRequestException(ERROR_MESSAGES.BAD_CAMPAIGN_DATA);
    }
  }

  async addCampaignRewards(
    campaignId: number,
    addCampaignRewardDto: AddCampaignRewardDto[],
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({ key: 'id', value: campaignId }),
      );
    }

    const s3Folder = getS3Folder(campaign.s3BucketSlug);
    const createManyRewardsData = await Promise.all(
      addCampaignRewardDto.map(
        async (reward): Promise<Prisma.CampaignRewardCreateManyInput> => {
          let imageKey = '';
          if (reward.image) {
            const fileName = appendTimestamp(reward.name);
            imageKey = await this.s3.uploadFile(reward.image, {
              s3Folder,
              fileName,
            });
          }

          return {
            ...reward,
            campaignId,
            image: imageKey,
          };
        },
      ),
    );

    return await this.prisma.campaignReward.createMany({
      data: createManyRewardsData,
    });
  }

  async update(id: number, updateCampaignDto: UpdateCampaignDto) {
    const { slug: newSlug, ...rest } = updateCampaignDto;

    if (newSlug) {
      await this.throwIfSlugTaken(newSlug);
    }

    try {
      const updatedCampaign = await this.prisma.campaign.update({
        where: { id },
        data: {
          ...rest,
          ...(newSlug && { slug: newSlug }),
        },
      });
      return updatedCampaign;
    } catch {
      throw new NotFoundException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({ key: 'id', value: id }),
      );
    }
  }

  async updateFiles(id: number, campaignFilesDto: UpdateCampaignFilesDto) {
    const { cover, banner, info, video } = campaignFilesDto;

    let campaign = await this.prisma.campaign.findUnique({ where: { id } });

    if (!campaign) {
      throw new NotFoundException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({ key: 'id', value: id }),
      );
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
      where: { id },
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
    id: number,
    file: Express.Multer.File,
    field: ComicFileProperty,
  ) {
    let campaign: Campaign;
    try {
      campaign = await this.prisma.campaign.findUnique({
        where: { id },
      });
    } catch {
      throw new NotFoundException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({ key: 'id', value: id }),
      );
    }

    const s3Folder = getS3Folder(campaign.s3BucketSlug);
    const oldFileKey = campaign[field];
    const newFileKey = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: field,
    });

    try {
      campaign = await this.prisma.campaign.update({
        where: { id },
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
    campaignId: string,
    rewardId: number,
    userId: number,
    ref?: string,
  ) {
    const where = processCampaignIdString(campaignId);

    const campaign = await this.prisma.campaign.findUnique({ where });

    if (!campaign) {
      throw new BadRequestException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({
          key: 'slug',
          value: campaign.slug,
        }),
      );
    }

    try {
      const { user } = await this.prisma.userCampaignInterest.upsert({
        where: { campaignId_userId: { campaignId: campaign.id, userId } },
        include: { user: true },
        update: {
          reward: { connect: { id: rewardId } },
        },
        create: {
          campaign: { connect: { id: campaign.id } },
          expressedInterestAt: new Date(),
          user: { connect: { id: userId } },
          reward: { connect: { id: rewardId } },
        },
      });

      this.websocketGateway.handleActivityNotification({
        user,
        type: ActivityNotificationType.ExpressedInterest,
        targetId: campaign.slug,
        targetTitle: campaign.title,
      });

      await this.redeemReferral(ref, userId, campaign.id);
    } catch (e) {
      throw new BadRequestException(
        ERROR_MESSAGES.FAILED_TO_EXPRESS_INTEREST({
          key: 'slug',
          value: campaign.slug,
        }),
      );
    }
  }

  async redeemReferral(ref: string, refereeId: number, campaignId: number) {
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
          where: { id: refereeId, campaignId },
          data: { referrerId: referrer.id },
        });
      }
    }
  }

  async findAll(query: CampaignFilterParamsDto): Promise<CampaignInput[]> {
    const campaigns = await this.prisma.campaign.findMany({
      skip: query.skip,
      take: query.take,
    });

    const getCampaignWithStats = campaigns.map(async (campaign) => {
      const stats = await this.findStats(campaign.id);
      return { ...campaign, stats };
    });

    const campaignWithStats = await Promise.all(getCampaignWithStats);
    return campaignWithStats;
  }

  async findOne(campaignId: string, userId?: number): Promise<CampaignInput> {
    const where = processCampaignIdString(campaignId);
    const campaign = await this.prisma.campaign.findUnique({
      where,
      include: { creator: true, rewards: true },
    });

    if (!campaign) {
      throw new BadRequestException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({ key: 'slug', value: campaignId }),
      );
    }

    const stats = await this.findStats(campaign.id, userId);
    return { ...campaign, stats };
  }

  async findStats(
    id: string | number,
    userId?: number,
  ): Promise<CampaignStatsInput> {
    const campaignId = await this.getCampaignIdFromIdentifier(id);

    const userReceipt = userId
      ? await this.prisma.userCampaignInterest.findUnique({
          where: { campaignId_userId: { campaignId, userId } },
          select: { reward: { select: { price: true } } },
        })
      : undefined;

    const userCampaignInterests =
      await this.prisma.userCampaignInterest.findMany({
        where: { campaignId },
        select: { reward: { select: { price: true } } },
      });

    const totalPrice = userCampaignInterests.reduce((sum, interest) => {
      return sum + (interest.reward?.price || 0);
    }, 0);

    return {
      tentativeBackers: userCampaignInterests.length,
      tentativeAmountPledged: totalPrice,
      myTentativeAmount: userReceipt?.reward?.price,
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
    campaignId: number,
    query: CampaignReferralParams,
    userId: number,
  ): Promise<PaginatedUserCampaignInterestInput> {
    const referrals = await this.prisma.userCampaignInterest.findMany({
      where: { referrerId: userId, campaignId },
      include: { user: true, reward: { select: { price: true } } },
      skip: query?.skip,
      take: query?.take,
    });

    const totalItems = await this.prisma.userCampaignInterest.count({
      where: { referrerId: userId },
    });

    return { data: referrals, totalItems };
  }

  async findCampaignBackers(campaignId: string) {
    const where = processCampaignIdString(campaignId);
    const campaign = await this.prisma.campaign.findUnique({
      where,
      include: { creator: true, rewards: true },
    });

    if (!campaign) {
      throw new BadRequestException(
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND({ key: 'id', value: campaignId }),
      );
    }

    const backers = await this.prisma.userCampaignInterest.findMany({
      where: { campaignId: campaign.id },
      include: { user: true, reward: { select: { price: true } } },
      orderBy: { expressedInterestAt: 'desc' },
    });

    return backers;
  }

  async throwIfTitleTaken(title: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { title: insensitive(title) },
    });

    if (campaign)
      throw new BadRequestException(ERROR_MESSAGES.TITLE_TAKEN(title));
  }

  async throwIfSlugTaken(slug: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { slug: insensitive(slug) },
    });

    if (campaign)
      throw new BadRequestException(ERROR_MESSAGES.SLUG_TAKEN(slug));
  }

  private async getCampaignIdFromIdentifier(id: string | number) {
    if (typeof id == 'string') {
      const where = processCampaignIdString(id);
      const campaign = await this.prisma.campaign.findUnique({ where });

      return campaign.id;
    }

    return id;
  }

  async expressGuestInterest(query: GuestInterestParams) {
    const { campaignId, rampUpPeriod, number } = query;

    const guestUsers = await this.prisma.user.findMany({
      where: { referrerId: 1 },
      take: number,
    });
    const rewards = await this.prisma.campaignReward.findMany({
      where: { campaignId },
    });

    const reward = selectReward(rewards);

    guestUsers.forEach((user, index) => {
      setTimeout(
        () => {
          this.expressUserInterest(campaignId.toString(), reward.id, user.id);
        },
        index * rampUpPeriod * 60 * 1000,
      );
    });
  }
}
