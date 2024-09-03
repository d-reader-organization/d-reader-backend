import { Injectable } from '@nestjs/common';
import { Comic, ComicIssue, Creator } from '@prisma/client';
import { CREATOR_REGISTERED } from './templates/creatorRegistered';
import { CREATOR_FILES_UPDATED } from './templates/creatorFilesUpdated';
import { MessagePayload, WebhookClient } from 'discord.js';
import { CreatorFile } from './dto/types';
import { CREATOR_PROFILE_UPDATED } from './templates/creatorProfileUpdated';
import { COMIC_CREATED, COMIC_UPDATED } from './templates/comic';
import {
  COMIC_ISSUE_CREATED,
  COMIC_ISSUE_UPDATED,
} from './templates/comicIssue';
import { D_READER_LINKS } from '../utils/client-links';
import { COMIC_PAGES_UPSERT } from './templates/comicPages';

@Injectable()
export class DiscordNotificationService {
  private readonly payload: MessagePayload;
  private readonly discord?: WebhookClient;

  constructor() {
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

  async notifyCreatorRegistration(creator: Creator) {
    try {
      await this.discord?.send(CREATOR_REGISTERED(creator, this.payload));
    } catch (e) {
      console.error('Error sending notification for creator registration', e);
    }
  }

  async notifyCreatorFilesUpdate(name: string, files: CreatorFile[]) {
    try {
      await this.discord?.send(
        CREATOR_FILES_UPDATED(name, this.payload, files),
      );
    } catch (e) {
      console.error('Error sending notification for creator file updates', e);
    }
  }

  async notifyCreatorEmailVerification(creator: Creator) {
    try {
      await this.discord?.send(
        `Creator ${creator.name} (${creator.email}) has verified their email address!`,
      );
    } catch (e) {
      console.error(
        "Error sending notification for creator's email verification",
        e,
      );
    }
  }

  async notifyCreatorProfileUpdate({
    oldCreator,
    updatedCreator,
  }: {
    oldCreator: Creator;
    updatedCreator: Creator;
  }) {
    try {
      await this.discord?.send(
        CREATOR_PROFILE_UPDATED({
          oldData: oldCreator,
          updatedData: updatedCreator,
          hyperlink: D_READER_LINKS.creator(updatedCreator.slug),
          payload: this.payload,
        }),
      );
    } catch (e) {
      console.error(
        "Error sending notification for creator's profile update",
        e,
      );
    }
  }

  async notifyComicCreated(comic: Comic) {
    await this.discord.send(
      COMIC_CREATED({
        comic,
        hyperlink: D_READER_LINKS.comic(comic.slug),
        payload: this.payload,
      }),
    );
  }

  async notifyComicUpdated({
    oldComic,
    updatedComic,
  }: {
    oldComic: Comic;
    updatedComic: Comic;
  }) {
    try {
      await this.discord?.send(
        COMIC_UPDATED({
          oldData: oldComic,
          updatedData: updatedComic,
          hyperlink: D_READER_LINKS.comic(updatedComic.slug),
          payload: this.payload,
        }),
      );
    } catch (e) {
      console.error('Error sending notification for comic updated', e);
    }
  }

  async notifyComicIssueCreated(comicIssue: ComicIssue) {
    await this.discord.send(
      COMIC_ISSUE_CREATED({
        comicIssue,
        hyperlink: D_READER_LINKS.comicIssue(comicIssue.id),
        payload: this.payload,
      }),
    );
  }

  async notifyComicIssueUpdated({
    oldIssue,
    updatedIssue,
  }: {
    oldIssue: ComicIssue;
    updatedIssue: ComicIssue;
  }) {
    try {
      await this.discord?.send(
        COMIC_ISSUE_UPDATED({
          oldData: oldIssue,
          updatedData: updatedIssue,
          hyperlink: D_READER_LINKS.comicIssue(updatedIssue.id),
          payload: this.payload,
        }),
      );
    } catch (e) {
      console.error('Error sending notification for comic updated', e);
    }
  }

  async notifyComicPagesUpsert(comicIssue: ComicIssue) {
    await this.discord.send(
      COMIC_PAGES_UPSERT({
        comicIssue,
        hyperlink: D_READER_LINKS.comicIssue(comicIssue.id),
        payload: this.payload,
      }),
    );
  }
}
