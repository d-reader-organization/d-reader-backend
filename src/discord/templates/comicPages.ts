import { ComicIssue } from '@prisma/client';
import { bold, MessagePayload } from 'discord.js';

export const COMIC_PAGES_UPSERT = ({
  comicIssue,
  hyperlink,
  payload,
}: {
  comicIssue: ComicIssue;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `Comic pages created/updated for comic episode ${bold(
      comicIssue.title,
    )}! [Details](${hyperlink})`,
  };
  return payload;
};
