import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatorStats } from '../comic/types/creator-stats';
import { mockPromise, getRandomFloatOrInt } from '../utils/helpers';
import { UserCreatorMyStatsDto } from './types/user-creator-my-stats.dto';
import { UserCreator } from '@prisma/client';
import { PickByType } from 'src/types/shared';

@Injectable()
export class UserCreatorService {
  constructor(private readonly prisma: PrismaService) {}

  async getCreatorStats(slug: string): Promise<CreatorStats> {
    const countFollowers = this.prisma.userCreator.count({
      where: { creatorSlug: slug, followedAt: { not: null } },
    });

    const countComicIssues = this.prisma.comicIssue.count({
      where: { comic: { creator: { slug } } },
    });

    const calculateTotalVolume = mockPromise(getRandomFloatOrInt(1, 1000));

    const [followersCount, comicIssuesCount, totalVolume] = await Promise.all([
      countFollowers,
      countComicIssues,
      calculateTotalVolume,
    ]);

    return { followersCount, comicIssuesCount, totalVolume };
  }

  async getUserStats(
    creatorSlug: string,
    userId?: number,
  ): Promise<UserCreatorMyStatsDto> {
    if (!userId) return undefined;

    const userCreator = await this.prisma.userCreator.findUnique({
      where: { creatorSlug_userId: { userId, creatorSlug } },
    });
    return { isFollowing: !!userCreator?.followedAt ?? false };
  }

  async toggleDate(
    userId: number,
    creatorSlug: string,
    property: keyof PickByType<UserCreator, Date>,
  ): Promise<UserCreator> {
    const userCreator = await this.prisma.userCreator.findUnique({
      where: {
        creatorSlug_userId: { userId, creatorSlug },
      },
    });

    // if date is existing, remove it, otherwise add a new date
    const updatedDate = !!userCreator?.[property] ? null : new Date();

    return await this.prisma.userCreator.upsert({
      where: { creatorSlug_userId: { userId, creatorSlug } },
      create: { creatorSlug, userId, [property]: new Date() },
      update: { [property]: updatedDate },
    });
  }
}
