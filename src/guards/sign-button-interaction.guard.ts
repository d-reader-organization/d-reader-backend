import { GuildMemberRoleManager, Interaction } from 'discord.js';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { InteractionType } from 'discord.js';

const autographsChannelId = '1179081739646275604';

export class IsSignButtonInteractionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const interaction = context.getArgByIndex(0) as Interaction;
    if (
      interaction.type === InteractionType.MessageComponent &&
      interaction.channelId === autographsChannelId
    ) {
      const roleManager = interaction.member.roles as GuildMemberRoleManager;
      const modRole = await interaction.guild.roles.fetch(
        process.env.DISCORD_VERIFIED_CREATOR_ROLE_ID,
      );
      return roleManager.member.roles.highest.position >= modRole.position;
    }
  }
}
