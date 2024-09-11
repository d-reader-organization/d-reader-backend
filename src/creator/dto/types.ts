import { Creator } from '@prisma/client';
import { PickFields } from '../../types/shared';

export type CreatorFileProperty = PickFields<
  Creator,
  'avatar' | 'banner' | 'logo'
>;

export type UserCreatorMyStatsDto = {
  isFollowing: boolean;
};

export type CreatorStatusProperty = keyof Pick<Creator, 'verifiedAt'>;
