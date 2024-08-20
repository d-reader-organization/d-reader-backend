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
import { FounderRoleGuard } from 'src/guards/discord.guard';

enum Action {
  publish = 'publish',
  verify = 'verify',
}

enum ButtonKey {
  comic = 'comic',
  comicIssue = 'comicIssue',
  creator = 'creator',
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
    const embedsTitle = message.embeds?.at(0).title;
    if (!embedsTitle) {
      return;
    }
    const [key, value] = embedsTitle.split(':');

    if (!Object.values<string>(ButtonKey).includes(key)) {
      return;
    }

    const verify = new ButtonBuilder()
      .setLabel('Verify')
      .setStyle(ButtonStyle.Primary);

    if (key === ButtonKey.creator) {
      verify.setCustomId(`${Action.verify};${ButtonKey.creator};${value}`);
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
      .setLabel('Publish')
      .setStyle(ButtonStyle.Primary);

    if (key === ButtonKey.comic) {
      publish.setCustomId(`${Action.publish};${ButtonKey.comic};${value}`);
      verify.setCustomId(`${Action.verify};${ButtonKey.comic};${value}`);
    } else if (key === ButtonKey.comicIssue) {
      publish.setCustomId(`${Action.publish};${ButtonKey.comicIssue};${value}`);
      verify.setCustomId(`${Action.verify};${ButtonKey.comicIssue};${value}`);
    }
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>({
      components: [publish, verify],
    });
    await message.reply({ components: [row] });
  }

  @On('interactionCreate')
  @UseGuards(FounderRoleGuard)
  async onButtonClicked(
    @EventParams() eventArgs: ClientEvents['interactionCreate'],
  ): Promise<InteractionReplyOptions> {
    const buttonInteraction = eventArgs[0] as ButtonInteraction;
    await buttonInteraction.deferReply({ ephemeral: true });
    const [action, key, value] = buttonInteraction.customId.split(';');

    const propertyName =
      action === Action.publish ? 'publishedAt' : 'verifiedAt';
    if (key === ButtonKey.comic) {
      const message = (await this.comicService.toggleDatePropUpdate({
        slug: value,
        propertyName,
        withMessage: true,
      })) as string;
      await buttonInteraction.followUp({ content: message });
    } else if (key === ButtonKey.comicIssue) {
      const message = (await this.comicIssueService.toggleDatePropUpdate({
        id: +value,
        propertyName,
        withMessage: true,
      })) as string;
      await buttonInteraction.followUp({ content: message });
    } else if (key === ButtonKey.creator) {
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
