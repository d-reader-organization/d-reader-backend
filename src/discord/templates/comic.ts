import { bold, MessagePayload } from 'discord.js';
import { Comic } from '@prisma/client';
import { embedsForUpdateNotification } from '../utils';

export const COMIC_CREATED = ({
  comic,
  hyperlink,
  payload,
}: {
  comic: Comic;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `📗 ${bold(
      comic.title,
    )} comic series created! [Details](${hyperlink})`,
  };
  return payload;
};

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
        title: `Comic: ${updatedData.slug}`,
        oldData,
        updatedData,
      }),
    ],
  };
  return payload;
};
