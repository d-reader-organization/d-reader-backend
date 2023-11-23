import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WebhookClient } from 'discord.js';
import config from '../../configs/config';
import { CREATOR_REGISTERED } from './templates/creatorRegistered';
import { MessagePayload } from 'discord.js';
import { CREATOR_FILES_UPDATED } from './templates/creatorFilesUpdated';
import { CreatorFiles } from './dto/types';
import { CREATOR_VERIFIED } from './templates/creatorVerified';

@Injectable()
export class DiscordService {
  private readonly apiUrl: string;
  private readonly discord: WebhookClient;
  private readonly payload: MessagePayload;

  constructor() {
    this.discord = new WebhookClient({
      id: process.env.DISCORD_CLIENT_ID,
      token: process.env.DISCORD_WEBHOOK_TOKEN,
    });
    this.apiUrl = config().client.dPublisherUrl;
    this.payload = new MessagePayload(
      this.discord.client,
      this.discord.options,
    );
  }
  async notifyCreatorRegistration(creator: Prisma.CreatorCreateInput) {
    try {
      await this.discord.send(
        CREATOR_REGISTERED(creator, this.apiUrl, this.payload),
      );
    } catch (e) {}
  }

  async notifyCreatorFilesUpdate(name: string, files: CreatorFiles) {
    try {
      await this.discord.send(CREATOR_FILES_UPDATED(name, this.payload, files));
    } catch (e) {}
  }

  async notifyCreatorEmailVerification(creator: Prisma.CreatorCreateInput) {
    try {
      await this.discord.send(
        CREATOR_VERIFIED(creator, this.apiUrl, this.payload),
      );
    } catch (e) {}
  }
}
