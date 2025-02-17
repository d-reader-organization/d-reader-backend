import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ProjectInput } from './dto/project.dto';
import { ERROR_MESSAGES } from '../utils/errors';
import { insensitive } from '../utils/lodash';
import { PROJECTS } from '../constants';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { ActivityNotificationType } from 'src/websockets/dto/activity-notification.dto';
import { ProjectReferralCampaignReceiptInput } from './dto/project-referral-campaign-receipt.dto';
import { ReferralCampaignReceiptParams } from './dto/referral-campaign-receipt-params.dto';
import { UserInterestedReceipt } from '@prisma/client';

@Injectable()
export class InvestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebSocketGateway,
  ) {}

  async expressUserInterest(
    projectSlug: string,
    expressedAmount: number,
    userId: number,
    ref?: string,
  ) {
    const project = PROJECTS.find((project) => project.slug == projectSlug);
    if (!project) {
      throw new BadRequestException(
        ERROR_MESSAGES.PROJECT_NOT_FOUND(projectSlug),
      );
    }

    let lastExpressedAmount = 0;
    let updatedReceipt: UserInterestedReceipt;
    try {
      const receipt = await this.prisma.userInterestedReceipt.findUnique({
        where: { projectSlug_userId: { projectSlug, userId } },
      });
      if (receipt) {
        lastExpressedAmount = receipt.expressedAmount;

        updatedReceipt = await this.prisma.userInterestedReceipt.update({
          where: { projectSlug_userId: { projectSlug, userId } },
          data: {
            expressedAmount: Math.min(1000, expressedAmount),
            timestamp: new Date(),
          },
        });
      } else {
        updatedReceipt = await this.prisma.userInterestedReceipt.create({
          data: {
            projectSlug,
            timestamp: new Date(),
            expressedAmount: Math.min(1000, expressedAmount),
            user: {
              connect: { id: userId },
            },
          },
        });
      }

      if (updatedReceipt.expressedAmount > lastExpressedAmount) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        this.websocketGateway.handleActivityNotification({
          user,
          type: ActivityNotificationType.ExpressedInterest,
          targetId: projectSlug,
          targetTitle: project.title,
        });
        await this.redeemReferral(ref, userId, projectSlug);
      }
    } catch (e) {
      throw new BadRequestException(
        ERROR_MESSAGES.FAILED_TO_EXPRESS_INTEREST(projectSlug),
      );
    }
  }

  async redeemReferral(ref: string, refereeId: number, projectSlug: string) {
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
        await this.prisma.userInterestedReceipt.update({
          where: { id: refereeId, projectSlug },
          data: { referrerId: referrer.id },
        });
      }
    }
  }

  async findAllInvestProjects(): Promise<ProjectInput[]> {
    const query = await this.prisma.userInterestedReceipt.groupBy({
      by: ['projectSlug'],
      _count: {
        projectSlug: true,
      },
      orderBy: {
        projectSlug: 'asc',
      },
    });

    const projectInterestCounts = query.map((arg) => ({
      slug: arg.projectSlug,
      countOfUserExpressedInterest: arg._count.projectSlug,
    }));
    return projectInterestCounts;
  }

  async findOneInvestProject(
    projectSlug: string,
    userId?: number,
  ): Promise<ProjectInput> {
    const query = userId
      ? await this.prisma.userInterestedReceipt.findUnique({
          where: { projectSlug_userId: { projectSlug, userId } },
        })
      : null;

    const data = await this.prisma.userInterestedReceipt.aggregate({
      where: { projectSlug },
      _count: { id: true },
      _sum: { expressedAmount: true },
    });
    return {
      slug: projectSlug,
      countOfUserExpressedInterest: data?._count?.id || 0,
      expectedPledgedAmount: data?._sum?.expressedAmount || 0,
      expressedAmount: query?.expressedAmount,
    };
  }

  async findAllReferralCampaignReceipts(
    query: ReferralCampaignReceiptParams,
    userId: number,
  ): Promise<ProjectReferralCampaignReceiptInput[]> {
    const projectsWithActiveCampaign = PROJECTS.filter(
      (project) => project.isCampaignActive,
    );

    const getProjectReferralReceipts = projectsWithActiveCampaign.map(
      async (project) => {
        const referralReceipts =
          await this.prisma.userInterestedReceipt.findMany({
            where: { referrerId: userId },
            include: { user: true },
            skip: query?.skip,
            take: query?.take,
          });

        const totalReferred = await this.prisma.userInterestedReceipt.count({
          where: { referrerId: userId },
        });
        return {
          title: project.title,
          slug: project.slug,
          receipts: referralReceipts,
          totalReferred,
        };
      },
    );

    const receipts = await Promise.all(getProjectReferralReceipts);
    return receipts;
  }

  async findUserInterestedReceipts(projectSlug: string) {
    const receipts = await this.prisma.userInterestedReceipt.findMany({
      where: { projectSlug },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });
    return receipts;
  }
}
