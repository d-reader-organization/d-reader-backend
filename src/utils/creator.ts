import { CreatorChannel } from '@prisma/client';

export const processCreatorIdString = (
  uniqueIdentifier: string,
): Pick<CreatorChannel, 'handle'> | Pick<CreatorChannel, 'id'> => {
  const isUniqueIdNumber = !isNaN(+uniqueIdentifier);

  if (isUniqueIdNumber) {
    return { id: +uniqueIdentifier };
  }

  return { handle: uniqueIdentifier };
};
