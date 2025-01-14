import { BadRequestException, Injectable } from '@nestjs/common';
import { Comic, ComicIssue, Creator } from '@prisma/client';
import { CREATOR_REGISTERED } from './templates/creatorRegistered';
import { CREATOR_FILES_UPDATED } from './templates/creatorFilesUpdated';
import {
  bold,
  MessagePayload,
  WebhookClient,
  ButtonStyle,
  APIMessageActionRowComponent,
  APIButtonComponentWithCustomId,
  APIActionRowComponent,
  ComponentType,
} from 'discord.js';
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
import { ERROR_MESSAGES } from 'src/utils/errors';
import { RequestSignatureMessagePayload } from './templates/requestSignatureMessagePayload';
import { getPublicUrl } from '../aws/s3client';
import { getDiscordUser } from 'src/utils/discord';

const logError = (notificationType: string, e: any) => {
  console.error(`Failed to send notification for ${notificationType}`);
  console.error('ERROR: ', e);
};

@Injectable()
export class DiscordService {
  private readonly payload: MessagePayload;
  private readonly discord?: WebhookClient;
  private readonly autographWebhook: WebhookClient;

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      console.warn('DISCORD_WEBHOOK_URL is undefined');
      return;
    }

    if (!process.env.DISCORD_AUTOGRAPH_WEBHOOK_URL) {
      console.warn('AUTOGRAPH_WEBHOOK_URL is undefined');
      return;
    }

    this.autographWebhook = new WebhookClient({
      url: process.env.DISCORD_AUTOGRAPH_WEBHOOK_URL,
    });
    this.discord = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });
    this.payload = new MessagePayload(
      this.discord.client,
      this.discord.options,
    );
  }

  async requestAutograph(username: string, address: string) {
    const asset = await this.prisma.collectibleComic.findUnique({
      where: { address },
      include: {
        metadata: {
          include: {
            collection: {
              include: {
                comicIssue: {
                  include: { statefulCovers: true },
                },
              },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new BadRequestException(ERROR_MESSAGES.ASSET_NOT_FOUND(address));
    }

    const creator = await this.prisma.creator.findFirst({
      where: {
        comics: {
          some: {
            issues: {
              some: {
                collectibleComicCollection: {
                  address: asset.metadata.collectionAddress,
                },
              },
            },
          },
        },
      },
    });

    if (!creator || !creator.discordId) {
      throw new BadRequestException(ERROR_MESSAGES.SIGNING_NOT_ACTIVE);
    }

    let creatorUsername: string;
    try {
      const creatorDiscord = await getDiscordUser(creator.discordId);
      creatorUsername = creatorDiscord.username;
    } catch (e) {
      throw new BadRequestException(ERROR_MESSAGES.SIGNING_NOT_ACTIVE);
    }

    const metadata = asset.metadata;
    const rarity = metadata.rarity;

    if (metadata.isSigned) {
      throw new BadRequestException(ERROR_MESSAGES.COMIC_ALREADY_SIGNED);
    }

    const buttonComponent: APIButtonComponentWithCustomId = {
      label: `Sign comic ✍🏼`,
      custom_id: `${username};${address}}`,
      style: ButtonStyle.Success,
      type: ComponentType.Button,
    };

    const component: APIActionRowComponent<APIMessageActionRowComponent> = {
      components: [buttonComponent],
      type: ComponentType.ActionRow,
    };

    const statefulCovers = asset.metadata.collection.comicIssue.statefulCovers;
    const cover = statefulCovers.find(
      (cover) =>
        cover.isSigned == metadata.isSigned &&
        cover.isUsed == metadata.isUsed &&
        cover.rarity == metadata.rarity,
    );

    await this.autographWebhook.send(
      RequestSignatureMessagePayload({
        payload: this.payload,
        content: `**${username}** requested **${creatorUsername}** to sign their **${asset.name}**`,
        imageUrl: getPublicUrl(cover.image),
        nftName: asset.name,
        rarity,
        components: [component],
      }),
    );
  }

  async creatorRegistered(creator: Creator) {
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
    oldCreator: Creator;
    updatedCreator: Creator;
  }) {
    try {
      await this.discord?.send(
        CREATOR_PROFILE_UPDATED({
          oldCreator,
          updatedCreator,
          hyperlink: D_READER_LINKS.creator(updatedCreator.slug),
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
    creator: Creator,
    property: CreatorStatusProperty,
  ) {
    const status = !!creator[property];
    await this.discord?.send(
      `🚨 Creator ${bold(creator.name)} status updated! ${property}: ${status}`,
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

  async creatorEmailVerified(creator: Creator) {
    await this.discord?.send(
      `📧 Creator ${bold(creator.name)} (${
        creator.email
      }) has verified their email address!`,
    );
  }
}
