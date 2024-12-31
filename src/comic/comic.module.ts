import { Module } from '@nestjs/common';
import { ComicService } from './comic.service';
import { ComicController } from './comic.controller';
import { UserComicService } from './user-comic.service';
import { ComicIssueService } from '../comic-issue/comic-issue.service';
import { ComicPageService } from '../comic-page/comic-page.service';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { UserComicIssueService } from '../comic-issue/user-comic-issue.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { NonceService } from '../nonce/nonce.service';
import { DiscordService } from '../discord/discord.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../auth/password.service';
import { WalletService } from '../wallet/wallet.service';

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
    NonceService,
    DiscordService,
    MailService,
    AuthService,
    JwtService,
    PasswordService,
    WalletService,
  ],
})
export class ComicModule {}
