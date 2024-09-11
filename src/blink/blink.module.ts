import { Module } from '@nestjs/common';
import { ComicIssueService } from '../comic-issue/comic-issue.service';
import { BlinkService } from './blink.service';
import { BlinkController } from './blink.controller';
import { s3Service } from '../aws/s3.service';
import { ComicPageService } from '../comic-page/comic-page.service';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { UserComicIssueService } from '../comic-issue/user-comic-issue.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { NonceService } from '../nonce/nonce.service';
import { DarkblockService } from '../candy-machine/darkblock.service';
import { TransactionService } from '../transactions/transaction.service';
import { DiscordService } from '../discord/discord.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../auth/password.service';
import { WalletService } from '../wallet/wallet.service';

@Module({
  controllers: [BlinkController],
  providers: [
    ComicIssueService,
    DarkblockService,
    NonceService,
    HeliusService,
    UserComicIssueService,
    CandyMachineService,
    ComicPageService,
    BlinkService,
    s3Service,
    TransactionService,
    DiscordService,
    MailService,
    AuthService,
    JwtService,
    PasswordService,
    WalletService,
  ],
})
export class BlinkModule {}
