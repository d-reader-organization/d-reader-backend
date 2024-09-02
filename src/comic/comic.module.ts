import { Module } from '@nestjs/common';
import { ComicService } from './comic.service';
import { ComicController } from './comic.controller';
import { UserComicService } from './user-comic.service';
import { ComicIssueService } from 'src/comic-issue/comic-issue.service';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';
import { UserComicIssueService } from 'src/comic-issue/user-comic-issue.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { DarkblockService } from 'src/candy-machine/darkblock.service';
import { NonceService } from 'src/nonce/nonce.service';
import { DiscordNotificationService } from 'src/discord/notification.service';
import { MailService } from 'src/mail/mail.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from 'src/auth/password.service';
import { WalletService } from 'src/wallet/wallet.service';

@Module({
  controllers: [ComicController],
  providers: [
    ComicService,
    UserComicService,
    ComicIssueService,
    ComicPageService,
    CandyMachineService,
    UserComicIssueService,
    HeliusService,
    DarkblockService,
    NonceService,
    DiscordNotificationService,
    MailService,
    AuthService,
    JwtService,
    PasswordService,
    WalletService,
  ],
})
export class ComicModule {}
