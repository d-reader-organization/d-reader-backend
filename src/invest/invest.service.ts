import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { ProjectInput } from './dto/project.dto';
import { ERROR_MESSAGES } from '../utils/errors';
import { insensitive } from '../utils/lodash';
import { PROJECTS, REFERRAL_REWARDING_PROJECT } from '../constants';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { ActivityNotificationType } from 'src/websockets/dto/activity-notification.dto';

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
    referralCode?: string,
  ) {
    const project = PROJECTS.find((project) => project.slug == projectSlug);
    if (!project) {
      throw new BadRequestException(
        ERROR_MESSAGES.PROJECT_NOT_FOUND(projectSlug),
      );
    }

    try {
      const { user } = await this.prisma.userInterestedReceipt.upsert({
        where: { projectSlug_userId: { projectSlug, userId } },
        include: { user: true },
        update: {
          expressedAmount: Math.min(1000, expressedAmount),
        },
        create: {
          projectSlug,
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
        targetId: projectSlug,
        targetTitle: project.title,
      });

      await this.redeemReferral(userId, referralCode);
    } catch (e) {
      throw new BadRequestException(
        ERROR_MESSAGES.FAILED_TO_EXPRESS_INTEREST(projectSlug),
      );
    }
  }

  async redeemReferral(
    refereeId: number,
    projectSlug: string,
    referralCode?: string,
  ) {
    if (!referralCode) return;
    if (projectSlug !== REFERRAL_REWARDING_PROJECT) return;

    const referrer = await this.prisma.user.findFirst({
      where: { username: insensitive(referralCode) },
    });

    if (!referrer) {
      console.log(`'${referralCode}' doesn't exist`);
      return;
    } else if (referrer.id === refereeId || referrer.referralsRemaining == 0) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: refereeId },
      include: { wallets: true },
    });

    if (!!user.referredAt) {
      return;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: refereeId },
      data: {
        referredAt: new Date(),
        referrer: {
          connect: { id: referrer.id },
          update: { referralsRemaining: { decrement: 1 } },
        },
      },
    });

    return updatedUser;
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

  async findUserInterestedReceipts(projectSlug: string) {
    const receipts = await this.prisma.userInterestedReceipt.findMany({
      where: { projectSlug },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });
    return receipts;
  }
}
