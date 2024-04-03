import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SecurityConfig, ThrottleConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { UserService } from '../user/user.service';
import { CreatorService } from '../creator/creator.service';
import { UserCreatorService } from '../creator/user-creator.service';
import { MailModule } from '../mail/mail.module';
import { WalletModule } from '../wallet/wallet.module';
import { DiscordNotificationService } from '../discord/notification.service';
import { DiscordModule } from '@discord-nestjs/core';
import { GoogleAuthService } from 'src/third-party/google-auth/google-auth.service';

@Module({
  imports: [
    DiscordModule.forFeature(),
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
    MailModule,
    WalletModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtStrategy,
    HeliusService,
    WebSocketGateway,
    UserService,
    CreatorService,
    UserCreatorService,
    DiscordNotificationService,
    GoogleAuthService,
  ],
  exports: [AuthService, PasswordService, JwtStrategy],
})
export class AuthModule {}
