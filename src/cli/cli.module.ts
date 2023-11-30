import { Module } from '@nestjs/common';
import { GenerateEnvironmentCommand } from './generate-environment-command';
import { CreateAuctionHouseCommand } from './create-auction-house-command';
import { GenerateEnvironmentQuestions } from './generate-environment-questions';
import { AirdropSolCommand } from './airdrop-sol-command';
import { AirdropSolQuestions } from './airdrop-sol-questions';
import { LoginUserCommand } from './login-user-command';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module';
import { SecurityConfig } from '../configs/config.interface';
import { MintOneCommand } from './mint-one-command';
import { MintOneQuestions } from './mint-one-questions';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { CreateAuctionHouseQuestions } from './create-auction-house-questions';
import { SyncWebhookCommand } from './sync-webhook-command';
import { SyncWebhookQuestions } from './sync-webhook-questions';
import { WalletService } from '../wallet/wallet.service';
import { SyncWalletCommand } from './sync-wallet-command';
import { SyncWalletQuestions } from './sync-wallet-questions';
import { AddAllowList } from './add-allow-list-command';
import { AddAllowListQuestions } from './add-allow-list-questions';
import { ThawCollectionCommand } from './thaw-collection-command';
import { ThawCollectionQuestions } from './thaw-collection-question';
import { DarkblockService } from '../candy-machine/darkblock.service';
import { BundlrWithdrawCommand } from './bundlr-withdraw-command';
import { MintRemainingCommand } from './mint-remaining-command';
import { MintRemainingQuestions } from './mint-remaining-questions';
import { LoginUserQuestions } from './login-user-questions';
import { AddGroupQuestions } from './add-group-questions';
import { AddGroupCommand } from './add-group-command';
import { BundlrFundCommand } from './bundlr-fund-command';
import { BundlrFundQuestions } from './bundlr-fund-questions';
import { UserService } from '../user/user.service';
import { MailModule } from '../mail/mail.module';
import { s3Module } from '../aws/s3.module';
import { PrismaModule } from 'nestjs-prisma';
import { JwtModule } from '@nestjs/jwt';
import config from '../configs/config';
import { ComicIssueService } from '../comic-issue/comic-issue.service';
import { ComicPageService } from '../comic-page/comic-page.service';
import { UserComicIssueService } from '../comic-issue/user-comic-issue.service';
import { AddCollectionDarkblockCommand } from './add-collection-darkblock-command';
import { AddCollectionDarkblockQuestion } from './add-collection-darkblock-questions';
import { UpdateDateCommand } from './update-date-command';
import { UpdateDateQuestions } from './update-date-questions';
import { TransactionService } from '../transactions/transaction.service';
import { DelegateCreatorCommand } from './delegate-creator-command';
import { DelegateCreatorQuestions } from './delegate-creator-questions';
import { DiscordModule } from '@discord-nestjs/core';
import { DiscordConfigService } from '../discord/config.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const securityConfig = configService.get<SecurityConfig>('security');
        return {
          secret: configService.get<string>('JWT_ACCESS_SECRET'),
          signOptions: { expiresIn: securityConfig.expiresIn },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule.forRoot({ isGlobal: true }),
    DiscordModule.forRootAsync({ useClass: DiscordConfigService }),
    s3Module,
    MailModule,
  ],
  providers: [
    BundlrWithdrawCommand,
    BundlrFundCommand,
    BundlrFundQuestions,
    GenerateEnvironmentCommand,
    GenerateEnvironmentQuestions,
    CreateAuctionHouseCommand,
    CreateAuctionHouseQuestions,
    SyncWebhookCommand,
    ThawCollectionCommand,
    ThawCollectionQuestions,
    SyncWebhookQuestions,
    AirdropSolCommand,
    AirdropSolQuestions,
    LoginUserCommand,
    LoginUserQuestions,
    MintOneCommand,
    MintOneQuestions,
    CandyMachineService,
    ComicIssueService,
    ComicPageService,
    UserComicIssueService,
    HeliusService,
    WebSocketGateway,
    SyncWalletQuestions,
    SyncWalletCommand,
    AddAllowListQuestions,
    MintRemainingCommand,
    MintRemainingQuestions,
    AddAllowList,
    WalletService,
    DarkblockService,
    UserService,
    AddGroupQuestions,
    AddGroupCommand,
    AddCollectionDarkblockCommand,
    AddCollectionDarkblockQuestion,
    UpdateDateCommand,
    UpdateDateQuestions,
    TransactionService,
    DelegateCreatorCommand,
    DelegateCreatorQuestions,
  ],
})
export class CLIModule {}
