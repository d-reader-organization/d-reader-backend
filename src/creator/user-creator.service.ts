import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreatorStats } from '../comic/types/creator-stats';
import { mockPromise, getRandomFloatOrInt } from '../utils/helpers';
import { UserCreatorMyStatsDto } from './types/user-creator-my-stats.dto';

@Injectable()
export class UserCreatorService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleFollow(userId: number, creatorSlug: string): Promise<boolean> {
    let userCreator = await this.prisma.userCreator.findUnique({
      where: {
        creatorSlug_userId: { userId, creatorSlug },
      },
    });

    userCreator = await this.prisma.userCreator.upsert({
      where: { creatorSlug_userId: { userId, creatorSlug } },
      create: { creatorSlug, userId, isFollowing: true },
      update: { isFollowing: !userCreator?.isFollowing },
    });

    return !!userCreator;
  }

  async getCreatorStats(slug: string): Promise<CreatorStats> {
    const countFollowers = this.prisma.userCreator.count({
      where: { creatorSlug: slug, isFollowing: true },
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
    return { isFollowing: userCreator?.isFollowing ?? false };
  }
}
