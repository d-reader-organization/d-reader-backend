import { Module } from '@nestjs/common';
import { ComicPageService } from './comic-page.service';
import { DiscordService } from '../discord/discord.service';

@Module({
  providers: [ComicPageService, DiscordService],
})
export class ComicPageModule {}
