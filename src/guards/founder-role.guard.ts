import { GuildMemberRoleManager, Interaction } from 'discord.js';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { InteractionType } from 'discord.js';

/* TODO move to .env as DISCORD_FOUNDER_ROLE_ID */
const founderRoleId = '1227650386094067772';

export class FounderRoleGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const interaction = context.getArgByIndex(0) as Interaction;
    if (interaction.type === InteractionType.MessageComponent) {
      const roleManager = interaction.member.roles as GuildMemberRoleManager;
      const modRole = await interaction.guild.roles.fetch(founderRoleId);
      return roleManager.member.roles.highest.position >= modRole.position;
    }
  }
}
