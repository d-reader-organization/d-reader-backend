import { GuildMemberRoleManager, Interaction } from 'discord.js';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { InteractionType } from 'discord.js';

export class IsSignButtonInteractionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const interaction = context.getArgByIndex(0) as Interaction;
    if (interaction.type === InteractionType.MessageComponent) {
      const roleManager = interaction.member.roles as GuildMemberRoleManager;
      const modRole = await interaction.guild.roles.fetch(
        process.env.DISCORD_VERIFIED_CREATOR_ROLE_ID,
      );
      return roleManager.member.roles.highest.position >= modRole.position;
    }
  }
}
