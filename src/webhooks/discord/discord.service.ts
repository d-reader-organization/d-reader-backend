import { Injectable } from '@nestjs/common';
import { Creator } from '@prisma/client';
import config from '../../configs/config';
import { CREATOR_REGISTERED } from './templates/creatorRegistered';
import { CREATOR_FILES_UPDATED } from './templates/creatorFilesUpdated';
import { MessagePayload, WebhookClient } from 'discord.js';
import { CreatorFile } from './dto/types';

@Injectable()
export class DiscordService {
  private readonly apiUrl: string;
  private readonly discord?: WebhookClient;
  private readonly payload: MessagePayload;

  constructor() {
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.discord = new WebhookClient({
        url: process.env.DISCORD_WEBHOOK_URL,
      });
    } else {
      console.warn('DISCORD_WEBHOOK_URL is undefined');
    }

    this.apiUrl = config().client.dPublisherUrl;
    this.payload = new MessagePayload(
      this.discord.client,
      this.discord.options,
    );
  }

  async notifyCreatorRegistration(creator: Creator) {
    try {
      await this.discord?.send(
        CREATOR_REGISTERED(creator, this.apiUrl, this.payload),
      );
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
}
