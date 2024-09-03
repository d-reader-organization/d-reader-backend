import { bold, MessagePayload } from 'discord.js';
import { ComicIssue } from '@prisma/client';
import { embedsForUpdateNotification } from '../utils';

export const COMIC_ISSUE_CREATED = ({
  comicIssue,
  hyperlink,
  payload,
}: {
  comicIssue: ComicIssue;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `📙 ${bold(
      comicIssue.title,
    )} comic episode created! [Details](${hyperlink})`,
  };
  return payload;
};

export const COMIC_ISSUE_UPDATED = ({
  oldData,
  updatedData,
  hyperlink,
  payload,
}: {
  oldData: ComicIssue;
  updatedData: ComicIssue;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `📙 ${bold(
      oldData.title,
    )} comic episode updated! [Details](${hyperlink})`,
    embeds: [
      embedsForUpdateNotification<ComicIssue>({
        title: `ComicIssue: ${updatedData.id}`,
        oldData,
        updatedData,
      }),
    ],
  };
  return payload;
};
