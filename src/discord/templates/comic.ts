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
  oldComic,
  updatedComic,
  hyperlink,
  payload,
}: {
  oldComic: Comic;
  updatedComic: Comic;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `📗 ${bold(oldComic.title)} (${
      updatedComic.verifiedAt ? 'verified' : 'unverified'
    }, ${
      updatedComic.publishedAt ? 'published' : 'unpublished'
    }) comic series updated! [Details](${hyperlink})`,
    embeds: [
      embedsForUpdateNotification<Comic>({
        title: `Comic: ${updatedComic.slug}`,
        oldData: oldComic,
        updatedData: updatedComic,
      }),
    ],
  };
  return payload;
};
