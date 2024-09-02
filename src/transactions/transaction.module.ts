import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { DarkblockService } from '../candy-machine/darkblock.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { TransactionService } from './transaction.service';
import { NonceService } from '../nonce/nonce.service';
import { BlinkService } from '../blink/blink.service';
import { ComicIssueService } from '../comic-issue/comic-issue.service';
import { ComicPageService } from '../comic-page/comic-page.service';
import { UserComicIssueService } from '../comic-issue/user-comic-issue.service';
import { DigitalAssetService } from '../digital-asset/digital-asset.service';
import { DiscordNotificationService } from 'src/discord/notification.service';
import { MailService } from 'src/mail/mail.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from 'src/auth/password.service';
import { WalletService } from 'src/wallet/wallet.service';

@Module({
  controllers: [TransactionController],
  providers: [
    CandyMachineService,
    AuctionHouseService,
    TransactionService,
    HeliusService,
    DarkblockService,
    NonceService,
    BlinkService,
    ComicIssueService,
    ComicPageService,
    UserComicIssueService,
    DigitalAssetService,
    DiscordNotificationService,
    MailService,
    AuthService,
    JwtService,
    PasswordService,
    WalletService,
  ],
})
export class TransactionModule {}
