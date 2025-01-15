import { Module } from '@nestjs/common';
import { DigitalAssetService } from './digital-asset.service';
import {
  DigitalAssetController,
  NftController,
} from './digital-asset.controller';
import { HeliusService } from '../webhooks/helius/helius.service';
import { NonceService } from '../nonce/nonce.service';
import { BotGateway } from 'src/discord/bot.gateway';
import { ComicService } from 'src/comic/comic.service';
import { ComicIssueService } from 'src/comic-issue/comic-issue.service';
import { CreatorService } from 'src/creator/creator.service';
import { DiscordModule } from '@discord-nestjs/core';
import { UserComicIssueService } from 'src/comic-issue/user-comic-issue.service';
import { UserComicService } from 'src/comic/user-comic.service';
import { DiscordService } from 'src/discord/discord.service';
import { MailService } from 'src/mail/mail.service';
import { ComicPageService } from 'src/comic-page/comic-page.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';
import { UserCreatorService } from 'src/creator/user-creator.service';
import { PasswordService } from 'src/auth/password.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { WalletService } from 'src/wallet/wallet.service';

@Module({
  imports: [DiscordModule.forFeature()],
  controllers: [NftController, DigitalAssetController],
  providers: [
    DigitalAssetService,
    HeliusService,
    NonceService,
    BotGateway,
    WalletService,
    JwtService,
    AuthService,
    ComicService,
    PasswordService,
    ComicIssueService,
    UserCreatorService,
    CreatorService,
    UserComicIssueService,
    UserComicService,
    CandyMachineService,
    ComicPageService,
    MailService,
    DiscordService,
  ],
})
export class DigitalAssetModule {}
