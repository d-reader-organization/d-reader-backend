import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { CreatorModule } from './creator/creator.module';
import { ComicModule } from './comic/comic.module';
import { ComicIssueModule } from './comic-issue/comic-issue.module';
import { CarouselModule } from './carousel/carousel.module';
import { PrismaModule, loggingMiddleware } from 'nestjs-prisma';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from './mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SecurityConfig } from 'src/configs/config.interface';
import { GenreModule } from './genre/genre.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ThrottlerModule, ThrottlerOptions } from '@nestjs/throttler';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CandyMachineModule } from './candy-machine/candy-machine.module';
import { AuctionHouseModule } from './auction-house/auction-house.module';
import { TransactionModule } from './transactions/transaction.module';
import { WebSocketModule } from './websockets/websockets.module';
import { UserModule } from './user/user.module';
import { DigitalAssetModule } from './digital-asset/digital-asset.module';
import { s3Module } from './aws/s3.module';
import config from './configs/config';
import { SettingsModule } from './settings/settings.module';
import { DiscordModule } from '@discord-nestjs/core';
import { DiscordConfigService } from './discord/config.service';
import { DiscordModule as DModule } from './discord/discord.module';
import { ThrottlerBehindProxyGuard } from './guards/throttler-behind-proxy.guard';
import { APP_GUARD } from '@nestjs/core';
import { NotificationModule } from './notification/notification.module';
import { ThirdPartyModule } from './third-party/third-party.module';
import { NonceModule } from './nonce/nonce.module';
import { DraftComicIssueSalesDataModule } from './draft-comic-issue-sales-data/draft-comic-issue-sales-data.module';
import { TwitterModule } from './twitter/twitter.module';
import { BlinkModule } from './blink/blink.module';
import { MutexModule } from './mutex/mutex.module';
import { InvestModule } from './invest/invest.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    AuthModule,
    CacheModule.register({ isGlobal: true }),
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    DiscordModule.forRootAsync({
      useClass: DiscordConfigService,
    }),
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
    PrismaModule.forRoot({
      isGlobal: true,

      prismaServiceOptions: {
        middlewares: [loggingMiddleware()],
        prismaOptions: { errorFormat: 'pretty' },
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const throttlersConfig =
          configService.get<ThrottlerOptions[]>('throttlers');
        return {
          throttlers: throttlersConfig,
          errorMessage:
            "You've sent too many requests. Please try again in a minute",
        };
      },
    }),
    WalletModule,
    CreatorModule,
    ComicModule,
    ComicIssueModule,
    CarouselModule,
    MailModule,
    GenreModule,
    WebhooksModule,
    NewsletterModule,
    CandyMachineModule,
    AuctionHouseModule,
    WebSocketModule,
    TransactionModule,
    DigitalAssetModule,
    s3Module,
    UserModule,
    SettingsModule,
    DModule,
    NotificationModule,
    ThirdPartyModule,
    NonceModule,
    DraftComicIssueSalesDataModule,
    TwitterModule,
    BlinkModule,
    MutexModule,
    InvestModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
