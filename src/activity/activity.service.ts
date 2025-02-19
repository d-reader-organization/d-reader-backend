import { Injectable } from '@nestjs/common';
import { ActivityTargetType, CreatorActivityFeedType } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { ERROR_MESSAGES } from '../utils/errors';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async indexCreatorFeedActivity(
    creatorId: number,
    targetId: string,
    targetType: ActivityTargetType,
    type: CreatorActivityFeedType,
    userId?: number,
  ) {
    this.prisma.creatorActivityFeed
      .create({
        data: {
          creator: { connect: { id: creatorId } },
          type,
          targetType,
          targetId,
          user: { connect: { id: userId } },
        },
      })
      .catch((e) =>
        ERROR_MESSAGES.FAILED_TO_INDEX_ACTIVITY(
          targetId,
          CreatorActivityFeedType.ComicIssueRated,
          e,
        ),
      );
  }
}
