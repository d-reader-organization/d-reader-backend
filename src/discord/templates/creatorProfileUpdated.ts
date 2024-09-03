import { Creator } from '@prisma/client';
import { bold, MessagePayload } from 'discord.js';
import { embedsForUpdateNotification } from '../utils';

export const CREATOR_PROFILE_UPDATED = ({
  oldData,
  updatedData,
  hyperlink,
  payload,
}: {
  oldData: Creator;
  updatedData: Creator;
  hyperlink: string;
  payload: MessagePayload;
}): MessagePayload => {
  payload.body = {
    content: `✍️ ${bold(
      oldData.name,
    )} creator profile updated! [Details](${hyperlink})`,
    embeds: [
      embedsForUpdateNotification<Creator>({
        title: `Creator: ${updatedData.slug}`,
        oldData,
        updatedData,
      }),
    ],
  };
  return payload;
};
