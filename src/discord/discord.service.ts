import { Injectable } from '@nestjs/common';
import { Comic, ComicIssue, CreatorChannel } from '@prisma/client';
import { CREATOR_REGISTERED } from './templates/creatorRegistered';
import { CREATOR_FILES_UPDATED } from './templates/creatorFilesUpdated';
import { bold, MessagePayload, WebhookClient } from 'discord.js';
import { CreatorFile } from './dto/types';
import { CREATOR_PROFILE_UPDATED } from './templates/creatorProfileUpdated';
import { COMIC_CREATED, COMIC_UPDATED } from './templates/comic';
import {
  COMIC_ISSUE_CREATED,
  COMIC_ISSUE_UPDATED,
} from './templates/comicIssue';
import { D_READER_LINKS } from '../utils/client-links';
import { COMIC_PAGES_UPSERT } from './templates/comicPages';
import { CreatorStatusProperty } from 'src/creator/dto/types';
import { PrismaService } from 'nestjs-prisma';

const logError = (notificationType: string, e: any) => {
  console.error(`Failed to send notification for ${notificationType}`);
  console.error('ERROR: ', e);
};

@Injectable()
export class DiscordService {
  private readonly payload: MessagePayload;
  private readonly discord?: WebhookClient;

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      console.warn('DISCORD_WEBHOOK_URL is undefined');
      return;
    }

    this.discord = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });
    this.payload = new MessagePayload(
      this.discord.client,
      this.discord.options,
    );
  }

  async creatorRegistered(creator: CreatorChannel) {
    try {
      await this.discord?.send(CREATOR_REGISTERED(creator, this.payload));
    } catch (e) {
      logError('creator registration', e);
    }
  }

  async creatorFilesUpdated(name: string, files: CreatorFile[]) {
    try {
      await this.discord?.send(
        CREATOR_FILES_UPDATED(name, this.payload, files),
      );
    } catch (e) {
      logError('creator file updates', e);
    }
  }

  async creatorProfileUpdated({
    oldCreator,
    updatedCreator,
  }: {
    oldCreator: CreatorChannel;
    updatedCreator: CreatorChannel;
  }) {
    try {
      await this.discord?.send(
        CREATOR_PROFILE_UPDATED({
          oldCreator,
          updatedCreator,
          hyperlink: D_READER_LINKS.creator(updatedCreator.handle),
          payload: this.payload,
        }),
      );
    } catch (e) {
      logError('creator profile update', e);
    }
  }

  async comicCreated(comic: Comic) {
    try {
      await this.discord.send(
        COMIC_CREATED({
          comic,
          hyperlink: D_READER_LINKS.comic(comic.slug),
          payload: this.payload,
        }),
      );
    } catch (e) {
      logError('comic created', e);
    }
  }

  async comicUpdated({
    oldComic,
    updatedComic,
  }: {
    oldComic: Comic;
    updatedComic: Comic;
  }) {
    try {
      await this.discord?.send(
        COMIC_UPDATED({
          oldComic,
          updatedComic,
          hyperlink: D_READER_LINKS.comic(updatedComic.slug),
          payload: this.payload,
        }),
      );
    } catch (e) {
      logError('comic update', e);
    }
  }

  async comicIssueCreated(comicIssue: ComicIssue) {
    try {
      await this.discord.send(
        COMIC_ISSUE_CREATED({
          comicIssue,
          hyperlink: D_READER_LINKS.comicIssue(comicIssue.id),
          payload: this.payload,
        }),
      );
    } catch (e) {
      logError('comic issue created', e);
    }
  }

  async comicIssueUpdated({
    oldIssue,
    updatedIssue,
  }: {
    oldIssue: ComicIssue;
    updatedIssue: ComicIssue;
  }) {
    try {
      await this.discord?.send(
        COMIC_ISSUE_UPDATED({
          oldIssue,
          updatedIssue,
          hyperlink: D_READER_LINKS.comicIssue(updatedIssue.id),
          payload: this.payload,
        }),
      );
    } catch (e) {
      logError('comic issue update', e);
    }
  }

  async comicPagesUpserted(comicIssue: ComicIssue) {
    try {
      await this.discord.send(
        COMIC_PAGES_UPSERT({
          comicIssue,
          hyperlink: D_READER_LINKS.comicIssue(comicIssue.id),
          payload: this.payload,
        }),
      );
    } catch (e) {
      logError('comic pages upserted', e);
    }
  }

  async creatorStatusUpdated(
    creator: CreatorChannel,
    property: CreatorStatusProperty,
  ) {
    const status = !!creator[property];
    await this.discord?.send(
      `🚨 Creator ${bold(
        creator.handle,
      )} status updated! ${property}: ${status}`,
    );
  }

  async comicStatusUpdated(comic: Comic, property: keyof Comic) {
    const status = !!comic[property];
    await this.discord?.send(
      `🚨 Comic ${bold(comic.title)} status updated! ${property}: ${status}`,
    );
  }

  async comicIssueStatusUpdated(issue: ComicIssue, property: keyof ComicIssue) {
    const status = !!issue[property];
    await this.discord?.send(
      `🚨 Episode ${bold(issue.title)} status updated! ${property}: ${status}`,
    );
  }

  async creatorEmailVerified(creator: CreatorChannel) {
    await this.discord?.send(
      `📧 Creator ${bold(creator.handle)} (${
        creator.handle
      }) has verified their email address!`,
    );
  }
}
