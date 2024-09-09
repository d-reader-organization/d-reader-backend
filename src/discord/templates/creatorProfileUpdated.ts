import { Creator } from '@prisma/client';
import { bold, MessagePayload } from 'discord.js';
import { embedsForUpdateNotification } from '../utils';

export const CREATOR_PROFILE_UPDATED = ({
  oldCreator,
  updatedCreator,
  hyperlink,
  payload,
}: {
  oldCreator: Creator;
  updatedCreator: Creator;
  hyperlink: string;
  payload: MessagePayload;
}): MessagePayload => {
  payload.body = {
    content: `✍️ ${bold(oldCreator.name)} (${
      updatedCreator.verifiedAt ? 'verified' : 'unverified'
    }) creator profile updated! [Details](${hyperlink})`,
    embeds: [
      embedsForUpdateNotification<Creator>({
        title: `Creator: ${updatedCreator.slug}`,
        oldData: oldCreator,
        updatedData: updatedCreator,
      }),
    ],
  };
  return payload;
};
