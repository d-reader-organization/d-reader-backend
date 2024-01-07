import { Module } from '@nestjs/common';
import { DiscordNotificationService } from './notification.service';
import { GetSignCommand } from './sign-comic.command';
import { TransactionService } from '../transactions/transaction.service';
import { DiscordModule as ParentDiscordModule } from '@discord-nestjs/core';

@Module({
  imports: [ParentDiscordModule.forFeature()],
  providers: [DiscordNotificationService, GetSignCommand, TransactionService],
})
export class DiscordModule {}
