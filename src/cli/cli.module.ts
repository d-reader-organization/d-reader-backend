import { Module } from '@nestjs/common';
import { GenerateEnvironmentCommand } from './generate-environment-command';
import { EnvironmentQuestions } from './environment-questions';
import { AirdropSolCommand } from './airdrop-sol-command';
import { AirdropQuestions } from './airdrop-questions';
import { AuthorizeWalletCommand } from './authorize-wallet-command';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from 'nestjs-prisma';
import { JwtModule } from '@nestjs/jwt';
import config from '../configs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module';
import { SecurityConfig } from '../configs/config.interface';
import { MintOneCommand } from './mint-one-command';
import { MintOneQuestions } from './mint-one-questions';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';

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
  ],
  providers: [
    GenerateEnvironmentCommand,
    EnvironmentQuestions,
    AirdropSolCommand,
    AirdropQuestions,
    AuthorizeWalletCommand,
    MintOneCommand,
    MintOneQuestions,
    CandyMachineService,
    HeliusService,
    WebSocketGateway,
  ],
})
export class CLIModule {}
