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
import { DReaderRoleGuard } from 'src/guards/discord.guard';
import { DISCORD_KEY_SEPARATOR } from './dto/constants';
import { ButtonKey } from './dto/enums.dto';

enum Action {
  publish = 'publish',
  verify = 'verify',
}

@SkipThrottle()
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

    if (!Object.values<string>(ButtonKey).includes(key)) {
      return;
    }

    const verify = new ButtonBuilder()
      .setLabel('(Un)verify')
      .setStyle(ButtonStyle.Primary);

    if (key === ButtonKey.Creator) {
      verify.setCustomId(`${Action.verify};${ButtonKey.Creator};${value}`);
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

    if (key === ButtonKey.Comic) {
      publish.setCustomId(`${Action.publish};${ButtonKey.Comic};${value}`);
      verify.setCustomId(`${Action.verify};${ButtonKey.Comic};${value}`);
    } else if (key === ButtonKey.ComicIssue) {
      publish.setCustomId(`${Action.publish};${ButtonKey.ComicIssue};${value}`);
      verify.setCustomId(`${Action.verify};${ButtonKey.ComicIssue};${value}`);
    }
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>({
      components: [publish, verify],
    });
    await message.reply({ components: [row] });
  }

  @On('interactionCreate')
  @UseGuards(DReaderRoleGuard)
  async onButtonClicked(
    @EventParams() eventArgs: ClientEvents['interactionCreate'],
  ): Promise<InteractionReplyOptions> {
    const buttonInteraction = eventArgs[0] as ButtonInteraction;
    await buttonInteraction.deferReply({ ephemeral: false });
    const [action, key, value] = buttonInteraction.customId.split(';');

    const propertyName =
      action === Action.publish ? 'publishedAt' : 'verifiedAt';
    if (key === ButtonKey.Comic) {
      const message = (await this.comicService.toggleDatePropUpdate({
        slug: value,
        propertyName,
        withMessage: true,
      })) as string;
      await buttonInteraction.followUp({ content: message });
    } else if (key === ButtonKey.ComicIssue) {
      const message = (await this.comicIssueService.toggleDatePropUpdate({
        id: +value,
        propertyName,
        withMessage: true,
      })) as string;
      await buttonInteraction.followUp({ content: message });
    } else if (key === ButtonKey.Creator) {
      const message = (await this.creatorService.toggleDatePropUpdate({
        slug: value,
        propertyName: 'verifiedAt',
        withMessage: true,
      })) as string;
      await buttonInteraction.followUp({ content: message });
    }
    return;
  }
}
