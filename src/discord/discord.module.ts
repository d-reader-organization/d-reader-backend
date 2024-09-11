import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { GetSignCommand } from './sign-comic.command';
import { TransactionService } from '../transactions/transaction.service';
import { DiscordModule as ParentDiscordModule } from '@discord-nestjs/core';
import { NonceService } from '../nonce/nonce.service';
import { BotGateway } from './bot.gateway';
import { ComicService } from 'src/comic/comic.service';
import { ComicIssueService } from 'src/comic-issue/comic-issue.service';
import { UserComicService } from 'src/comic/user-comic.service';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';
import { UserComicIssueService } from 'src/comic-issue/user-comic-issue.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { DarkblockService } from 'src/candy-machine/darkblock.service';
import { CreatorService } from 'src/creator/creator.service';
import { UserCreatorService } from 'src/creator/user-creator.service';
import { PasswordService } from 'src/auth/password.service';
import { AuthService } from 'src/auth/auth.service';
import { MailService } from 'src/mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { WalletService } from 'src/wallet/wallet.service';
import { PushNotificationCommand } from './push-notification.command';
import { FirebaseService } from 'src/third-party/firebase/firebase.service';

@Module({
  imports: [ParentDiscordModule.forFeature()],
  providers: [
    DiscordService,
    GetSignCommand,
    TransactionService,
    NonceService,
    BotGateway,
    ComicService,
    ComicIssueService,
    UserComicService,
    ComicPageService,
    CandyMachineService,
    UserComicIssueService,
    HeliusService,
    DarkblockService,
    CreatorService,
    UserCreatorService,
    PasswordService,
    AuthService,
    MailService,
    JwtService,
    WalletService,
    PushNotificationCommand,
    FirebaseService,
  ],
})
export class DiscordModule {}
