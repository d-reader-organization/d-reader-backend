import { Module } from '@nestjs/common';
import { SignComicCommnad } from './sign-comic.command';
import { ReflectMetadataProvider } from '@discord-nestjs/core';
import { TransactionService } from '../../transactions/transaction.service';

@Module({
  providers: [SignComicCommnad, TransactionService, ReflectMetadataProvider],
})
export class DiscordCommandsModule {}
