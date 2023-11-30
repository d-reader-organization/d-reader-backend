import { Module } from '@nestjs/common';
import { DiscordNotificationService } from './notification.service';
import { DiscordConfigService } from './config.service';
import { SignComicCommand } from './sign-comic.command';
import { TransactionService } from '../transactions/transaction.service';
import { ReflectMetadataProvider } from '@discord-nestjs/core';

@Module({
  providers: [
    DiscordNotificationService,
    DiscordConfigService,
    SignComicCommand,
    TransactionService,
    ReflectMetadataProvider,
  ],
})
export class DiscordModule {}
