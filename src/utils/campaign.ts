import { Campaign } from '@prisma/client';

export const processCampaignIdString = (
  uniqueIdentifier: string,
): Pick<Campaign, 'slug'> | Pick<Campaign, 'id'> => {
  const isUniqueIdNumber = !isNaN(+uniqueIdentifier);

  if (isUniqueIdNumber) {
    return { id: +uniqueIdentifier };
  }

  return { slug: uniqueIdentifier };
};
