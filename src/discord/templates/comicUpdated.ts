import { bold, MessagePayload } from 'discord.js';
import { Comic } from '@prisma/client';
import { embedsForUpdateNotification } from '../utils';

export const COMIC_UPDATED = ({
  oldData,
  updatedData,
  websiteUrl,
  payload,
}: {
  oldData: Comic;
  updatedData: Comic;
  websiteUrl: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `${bold(
      `comic:${updatedData.slug}`,
    )} comic series updated, [see all details here](${websiteUrl}/comic/${
      updatedData.slug
    })`,
    embeds: [
      embedsForUpdateNotification<Comic>({
        title: `comic:${updatedData.slug}`,
        oldData,
        updatedData,
      }),
    ],
  };
  return payload;
};
