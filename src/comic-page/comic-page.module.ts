import { Module } from '@nestjs/common';
import { ComicPageService } from './comic-page.service';
import { DiscordNotificationService } from '../discord/notification.service';

@Module({
  providers: [ComicPageService, DiscordNotificationService],
})
export class ComicPageModule {}
