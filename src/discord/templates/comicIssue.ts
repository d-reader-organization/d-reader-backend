import { bold, MessagePayload } from 'discord.js';
import { ComicIssue } from '@prisma/client';
import { embedsForUpdateNotification } from '../utils';
import { ButtonKey } from '../dto/enums.dto';
import { DISCORD_KEY_SEPARATOR } from '../dto/constants';

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
  oldIssue,
  updatedIssue,
  hyperlink,
  payload,
}: {
  oldIssue: ComicIssue;
  updatedIssue: ComicIssue;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `📙 ${bold(oldIssue.title)} (${
      updatedIssue.verifiedAt ? 'verified' : 'unverified'
    }, ${
      updatedIssue.publishedAt ? 'published' : 'unpublished'
    }) comic episode updated! [Details](${hyperlink})`,
    embeds: [
      embedsForUpdateNotification<ComicIssue>({
        title: ButtonKey.ComicIssue + DISCORD_KEY_SEPARATOR + updatedIssue.id,
        oldData: oldIssue,
        updatedData: updatedIssue,
      }),
    ],
  };
  return payload;
};
