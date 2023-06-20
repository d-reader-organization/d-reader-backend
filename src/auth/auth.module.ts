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
import { WalletService } from '../wallet/wallet.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';

@Module({
  imports: [
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
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    WalletService,
    JwtStrategy,
    HeliusService,
    WebSocketGateway,
  ],
  exports: [AuthService, PasswordService, JwtStrategy],
})
export class AuthModule {}
