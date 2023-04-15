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
import { SecurityConfig, ThrottleConfig } from 'src/configs/config.interface';
import { GenreModule } from './genre/genre.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CandyMachineModule } from './candy-machine/candy-machine.module';
import { AuctionHouseModule } from './auction-house/auction-house.module';
import { WebSocketModule } from './websockets/websockets.module';
import { NftModule } from './nft/nft.module';
import { s3Module } from './aws/s3.module';
import config from './configs/config';

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
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [loggingMiddleware()],
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const throttleConfig = configService.get<ThrottleConfig>('throttle');
        return {
          ttl: throttleConfig.ttl,
          limit: throttleConfig.limit,
          ignoreUserAgents: throttleConfig.ignoreUserAgents,
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
    NftModule,
    s3Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
