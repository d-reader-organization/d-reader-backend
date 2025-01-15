import { Injectable } from '@nestjs/common';
import {
  DiscordModuleOption,
  DiscordOptionsFactory,
} from '@discord-nestjs/core';
import { GatewayIntentBits } from 'discord.js';

@Injectable()
export class DiscordConfigService implements DiscordOptionsFactory {
  createDiscordOptions(): DiscordModuleOption {
    return {
      token: process.env.DISCORD_BOT_TOKEN,
      discordClientOptions: {
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ],
      },
      ...(process.env.DISCORD_WEBHOOK_URL && {
        webhook: { url: process.env.DISCORD_WEBHOOK_URL },
      }),
      registerCommandOptions: [
        {
          forGuild: process.env.DISCORD_GUILD_ID,
          removeCommandsBefore: true,
        },
      ],
    };
  }
}
