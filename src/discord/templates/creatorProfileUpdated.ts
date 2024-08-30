import { Creator } from '@prisma/client';
import { MessagePayload } from 'discord.js';
import { embedsForUpdateNotification } from '../utils';

export const CREATOR_PROFILE_UPDATED = ({
  oldData,
  updatedData,
  websiteUrl,
  payload,
}: {
  oldData: Creator;
  updatedData: Creator;
  websiteUrl: string;
  payload: MessagePayload;
}): MessagePayload => {
  payload.body = {
    content: `${oldData.name} creator updated, see changes [here](${websiteUrl}/creator/${updatedData.slug})`,
    embeds: [
      embedsForUpdateNotification<Creator>({
        title: `creator:${updatedData.slug}`,
        oldData,
        updatedData,
      }),
    ],
  };
  return payload;
};
