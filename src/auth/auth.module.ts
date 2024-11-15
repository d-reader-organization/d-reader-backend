import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SecurityConfig } from '../configs/config.interface';
import { PasswordService } from './password.service';
import { ThrottlerModule, ThrottlerOptions } from '@nestjs/throttler';
import { HeliusService } from '../webhooks/helius/helius.service';
import { UserService } from '../user/user.service';
import { CreatorService } from '../creator/creator.service';
import { UserCreatorService } from '../creator/user-creator.service';
import { MailModule } from '../mail/mail.module';
import { WalletModule } from '../wallet/wallet.module';
import { DiscordService } from '../discord/discord.service';
import { DiscordModule } from '@discord-nestjs/core';
import { GoogleAuthService } from '../third-party/google-auth/google-auth.service';
import { NonceService } from '../nonce/nonce.service';

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
        const throttlersConfig =
          configService.get<ThrottlerOptions[]>('throttlers');
        return {
          throttlers: throttlersConfig,
          errorMessage:
            "You've sent too many requests. Please try again in a minute",
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
    UserService,
    CreatorService,
    UserCreatorService,
    DiscordService,
    GoogleAuthService,
    NonceService,
  ],
  exports: [AuthService, PasswordService, JwtStrategy],
})
export class AuthModule {}
