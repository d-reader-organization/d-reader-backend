import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { loggingMiddleware, PrismaModule } from 'nestjs-prisma';

import { AppController } from './app.controller';

import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { SecurityConfig } from 'src/configs/config.interface';
import { ComicModule } from './comic/comic.module';
import config from './configs/config';
import { CollectionModule } from './collection/collection.module';

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
    WalletModule,
    CollectionModule,
    ComicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
