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
import { UserService } from '../user/user.service';
import { MailModule } from '../mail/mail.module';
import { s3Module } from '../aws/s3.module';
import { PrismaModule } from 'nestjs-prisma';
import { JwtModule } from '@nestjs/jwt';
import config from '../configs/config';

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
    s3Module,
    MailModule,
  ],
  providers: [
    BundlrWithdrawCommand,
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
  ],
})
export class CLIModule {}
