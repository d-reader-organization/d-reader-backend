import { Campaign, CampaignReward } from '@prisma/client';
import { D_READER_FRONTEND_URL, REFERRAL_CODE_KEY } from 'src/constants';

export const processCampaignIdString = (
  uniqueIdentifier: string,
): Pick<Campaign, 'slug'> | Pick<Campaign, 'id'> => {
  const isUniqueIdNumber = !isNaN(+uniqueIdentifier);

  if (isUniqueIdNumber) {
    return { id: +uniqueIdentifier };
  }

  return { slug: uniqueIdentifier };
};

export const selectReward = (rewards: CampaignReward[]) => {
  const length = rewards.length;
  const index = Math.floor(Math.random() * length);

  return rewards[index];
};

export const generateReferralLink = ({
  slug,
  username,
}: {
  slug: string;
  username: string;
}) => {
  return `${D_READER_FRONTEND_URL}/invest/${slug}?${REFERRAL_CODE_KEY}=${username}`;
};
