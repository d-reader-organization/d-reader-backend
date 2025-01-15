import { EventParams, InjectDiscordClient, On } from '@discord-nestjs/core';
import { BadRequestException, Injectable, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  ClientEvents,
  InteractionReplyOptions,
  Message,
  MessageActionRowComponentBuilder,
  APIMessageActionRowComponent,
  APIButtonComponentWithCustomId,
  APIActionRowComponent,
  ComponentType,
  TextChannel,
  MessagePayload,
} from 'discord.js';
import { ComicIssueService } from 'src/comic-issue/comic-issue.service';
import { ComicService } from 'src/comic/comic.service';
import { CreatorService } from 'src/creator/creator.service';
import { DiscordAdminRoleGuard } from 'src/guards/discord.guard';
import { DISCORD_KEY_SEPARATOR } from './dto/constants';
import { DiscordKey } from './dto/enums';
import {
  DISCORD_AUTOGRAPH_CHANNEL_ID,
  SKIP_THROTTLERS_CONFIG,
} from 'src/constants';
import { PrismaService } from 'nestjs-prisma';
import { ERROR_MESSAGES } from 'src/utils/errors';
import { RequestSignatureMessagePayload } from './templates/requestSignatureMessagePayload';
import { getPublicUrl } from '../aws/s3client';
import { getDiscordUser } from 'src/utils/discord';

enum Action {
  publish = 'publish',
  verify = 'verify',
}

@SkipThrottle(SKIP_THROTTLERS_CONFIG)
@Injectable()
export class BotGateway {
  constructor(
    private readonly comicService: ComicService,
    private readonly comicIssueService: ComicIssueService,
    private readonly creatorService: CreatorService,
    @InjectDiscordClient() private readonly client: Client,
    private readonly prisma: PrismaService,
  ) {}

  async requestAutograph(username: string, address: string) {
    const channel = (await this.client.channels.fetch(
      DISCORD_AUTOGRAPH_CHANNEL_ID,
    )) as TextChannel;
    const payload = new MessagePayload(channel, this.client.options);

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

    await channel.send(
      RequestSignatureMessagePayload({
        payload,
        content: `**${username}** requested **${creatorUsername}** to sign their **${asset.name}**`,
        imageUrl: getPublicUrl(cover.image),
        nftName: asset.name,
        rarity,
        components: [component],
      }),
    );
  }

  @On('messageCreate')
  async onMessage(message: Message): Promise<void> {
    const embedsTitle = message.embeds?.at(0)?.title;
    if (!embedsTitle) {
      return;
    }
    const [key, value] = embedsTitle.split(DISCORD_KEY_SEPARATOR);

    if (!Object.values<string>(DiscordKey).includes(key)) {
      return;
    }

    const verify = new ButtonBuilder()
      .setLabel('(Un)verify')
      .setStyle(ButtonStyle.Primary);

    if (key === DiscordKey.Creator) {
      verify.setCustomId(`${Action.verify};${DiscordKey.Creator};${value}`);
      await message.reply({
        components: [
          new ActionRowBuilder<MessageActionRowComponentBuilder>({
            components: [verify],
          }),
        ],
      });
      return;
    }

    const publish = new ButtonBuilder()
      .setLabel('(Un)publish')
      .setStyle(ButtonStyle.Primary);

    if (key === DiscordKey.Comic) {
      publish.setCustomId(`${Action.publish};${DiscordKey.Comic};${value}`);
      verify.setCustomId(`${Action.verify};${DiscordKey.Comic};${value}`);
    } else if (key === DiscordKey.ComicIssue) {
      publish.setCustomId(
        `${Action.publish};${DiscordKey.ComicIssue};${value}`,
      );
      verify.setCustomId(`${Action.verify};${DiscordKey.ComicIssue};${value}`);
    }
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>({
      components: [publish, verify],
    });
    await message.reply({ components: [row] });
  }

  @On('interactionCreate')
  @UseGuards(DiscordAdminRoleGuard)
  async onButtonClicked(
    @EventParams() eventArgs: ClientEvents['interactionCreate'],
  ): Promise<InteractionReplyOptions> {
    const buttonInteraction = eventArgs[0] as ButtonInteraction;
    await buttonInteraction.deferReply({ ephemeral: false });
    const [action, key, value] = buttonInteraction.customId.split(';');

    const property = action === Action.publish ? 'publishedAt' : 'verifiedAt';

    if (key === DiscordKey.Comic) {
      await this.comicService.toggleDate({ slug: value, property });
    } else if (key === DiscordKey.ComicIssue) {
      await this.comicIssueService.toggleDate({ id: +value, property });
    } else if (key === DiscordKey.Creator) {
      await this.creatorService.toggleDate({
        slug: value,
        property: 'verifiedAt',
      });
    }
    return;
  }
}
