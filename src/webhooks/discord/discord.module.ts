import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';

@Module({
  providers: [DiscordService],
})
export class DiscordModule {}
