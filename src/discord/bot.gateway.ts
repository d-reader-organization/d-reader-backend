import { EventParams, On } from '@discord-nestjs/core';
import { Injectable, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ClientEvents,
  InteractionReplyOptions,
  Message,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { ComicIssueService } from 'src/comic-issue/comic-issue.service';
import { ComicService } from 'src/comic/comic.service';
import { CreatorService } from 'src/creator/creator.service';
import { DiscordAdminRoleGuard } from 'src/guards/discord.guard';
import { DISCORD_KEY_SEPARATOR } from './dto/constants';
import { DiscordKey } from './dto/enums';
import { SKIP_THROTTLERS_CONFIG } from 'src/constants';

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
  ) {}

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
