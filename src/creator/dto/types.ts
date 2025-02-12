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

export type SearchCreator = Pick<
  CreatorChannel,
  'avatar' | 'displayName' | 'handle'
> & {
  issuesCount: number;
};
