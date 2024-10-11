import { ComicIssue } from '@prisma/client';
import { bold, MessagePayload } from 'discord.js';
import { DiscordKey } from '../dto/enums';
import { DISCORD_KEY_SEPARATOR } from '../dto/constants';

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
    content: `Comic pages created/updated for (${
      comicIssue.verifiedAt ? 'verified' : 'unverified'
    }, ${
      comicIssue.publishedAt ? 'published' : 'unpublished'
    })  comic episode ${bold(comicIssue.title)}! [Details](${hyperlink})`,
    embeds: [
      { title: DiscordKey.ComicIssue + DISCORD_KEY_SEPARATOR + comicIssue.id },
    ],
  };
  return payload;
};
