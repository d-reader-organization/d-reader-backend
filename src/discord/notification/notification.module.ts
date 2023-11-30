import { Module } from '@nestjs/common';
import { DiscordNotificationService } from './notification.service';

@Module({
  providers: [DiscordNotificationService],
})
export class DiscordNotificationModule {}
