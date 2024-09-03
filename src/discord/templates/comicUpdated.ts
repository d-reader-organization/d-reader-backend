import { bold, MessagePayload } from 'discord.js';
import { Comic } from '@prisma/client';
import { embedsForUpdateNotification } from '../utils';

export const COMIC_UPDATED = ({
  oldData,
  updatedData,
  hyperlink,
  payload,
}: {
  oldData: Comic;
  updatedData: Comic;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `📗 ${bold(
      oldData.title,
    )} comic series updated! [Details](${hyperlink})`,
    embeds: [
      embedsForUpdateNotification<Comic>({
        title: `Comic: ${updatedData.title}`,
        oldData,
        updatedData,
      }),
    ],
  };
  return payload;
};
