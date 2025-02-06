import { CreatorChannel } from '@prisma/client';
import { PickFields } from '../../types/shared';

export type CreatorFileProperty = PickFields<
  CreatorChannel,
  'banner' | 'avatar'
>;

export type UserCreatorMyStatsDto = {
  isFollowing: boolean;
};

export type CreatorStatusProperty = keyof Pick<CreatorChannel, 'verifiedAt'>;

export type SearchCreator = Pick<CreatorChannel, 'avatar' | 'handle'> & {
  issuesCount: number;
};

export type RevenueSnapshot = {
  date: Date;
  sales: number;
  royalties: number;
  others: number;
};
