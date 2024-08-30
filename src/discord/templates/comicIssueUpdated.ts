import { bold, MessagePayload } from 'discord.js';
import { ComicIssue } from '@prisma/client';
import { embedsForUpdateNotification } from '../utils';

export const COMIC_ISSUE_UPDATED = ({
  oldData,
  updatedData,
  websiteUrl,
  payload,
}: {
  oldData: ComicIssue;
  updatedData: ComicIssue;
  websiteUrl: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `${bold(
      oldData.title,
    )} comic issue updated, [see all details here](${websiteUrl}/comic-issue/${
      updatedData.id
    })`,
    embeds: [
      embedsForUpdateNotification<ComicIssue>({
        title: `comicIssue:${updatedData.id}`,
        oldData,
        updatedData,
      }),
    ],
  };
  return payload;
};
