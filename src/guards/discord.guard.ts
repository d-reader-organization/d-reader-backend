import { GuildMemberRoleManager, Interaction } from 'discord.js';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { InteractionType } from 'discord.js';

/* TODO move to .env as DISCORD_DREADER_ROLE_ID */
const dReaderRoleId = '1034919555853725828';
const allowedUserIds = [
  '221378024157741056',
  '1032919949880078376',
  '398482199667671041',
];

const dPublisherChannelId = '1177212861525790750';

export class DiscordAdminRoleGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const interaction = context.getArgByIndex(0) as Interaction;
    if (
      interaction.channelId === dPublisherChannelId &&
      interaction.type === InteractionType.MessageComponent
    ) {
      const roleManager = interaction.member.roles as GuildMemberRoleManager;
      const modRole = await interaction.guild.roles.fetch(dReaderRoleId);
      return roleManager.member.roles.highest.position >= modRole.position;
    }
  }
}

export class PushNotificationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const interaction = context.getArgByIndex(0) as Interaction;
    if (
      interaction.channelId === dPublisherChannelId &&
      interaction.type === InteractionType.ApplicationCommand
    ) {
      const isAllowed = allowedUserIds.includes(interaction.member.user.id);
      if (!isAllowed) {
        await interaction.deferReply({ ephemeral: true });
        await interaction.followUp({
          content: 'You are not allowed to use this command',
        });
      }
      return isAllowed;
    }
  }
}
