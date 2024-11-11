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
import { CreateAuctionHouseQuestions } from './create-auction-house-questions';
import { SyncWebhookCommand } from './sync-webhook-command';
import { SyncWebhookQuestions } from './sync-webhook-questions';
import { WalletService } from '../wallet/wallet.service';
import { SyncWalletCommand } from './sync-wallet-command';
import { SyncWalletQuestions } from './sync-wallet-questions';
import { AddWhitelistedWalletsCommand } from './add-whitelisted-wallets-command';
import { AddWhitelistedWalletsQuestions } from './add-whitelisted-wallets-questions';
import { DarkblockService } from '../candy-machine/darkblock.service';
import { BundlrWithdrawCommand } from './bundlr-withdraw-command';
import { MintRemainingCommand } from './mint-remaining-command';
import { MintRemainingQuestions } from './mint-remaining-questions';
import { LoginUserQuestions } from './login-user-questions';
import { FetchCandyMachineQuestions } from './fetch-candy-machine-questions';
import { FetchCandyMachineCommand } from './fetch-candy-machine-command';
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
import { SyncCollectionQuestions } from './sync-collection-questions';
import { SyncCollectionCommand } from './sync-collection-command';
import { DeleteCandyMachineCommand } from './delete-candy-machine-command';
import { DeleteCandyMachineQuestions } from './delete-candy-machine-questions';
import { SyncListingsCommand } from './sync-listings-command';
import { SyncListingsQuestions } from './sync-listings-questions';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { CreateNonceQuestions } from './create-nonce-questions';
import { CreateNonceCommand } from './create-nonce-command';
import { NonceService } from '../nonce/nonce.service';
import { SyncCoreAssetCommand } from './sync-core-assets-command';
import { SyncCoreAssetsQuestions } from './sync-core-assets-questions';
import { UpdateNonceCommand } from './update-nonce-command';
import { UpdateNonceQuestions } from './update-nonce.questions';
import { InsertItemsCommand } from './insert-items-command';
import { InsertItemsQuestions } from './insert-items-questions';
import { FetchCollectionSaleDetailsCommand } from './fetch-sale-collection-details-command';
import { FetchCollectionSaleDetailsQuestions } from './fetch-sale-collection-details-questions';
import { WebSocketModule } from '../websockets/websockets.module';
import { DiscordService } from '../discord/discord.service';
import { SyncMintReceptsCommand } from './sync-mint-receipts-command';
import { UpdateCMGroupPriceCommand } from './update-cm-group-price-command';
import { UpdateCMGroupPriceQuestions } from './update-cm-group-price-questions';
import { VaultTransferCommand } from './vault-transfer-command';
import { VaultTransferQuestions } from './vault-transfer-questions';

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
    WebSocketModule,
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
    SyncWalletQuestions,
    SyncWalletCommand,
    AddWhitelistedWalletsQuestions,
    MintRemainingCommand,
    MintRemainingQuestions,
    AddWhitelistedWalletsCommand,
    WalletService,
    DarkblockService,
    UserService,
    FetchCandyMachineQuestions,
    FetchCandyMachineCommand,
    AddCollectionDarkblockCommand,
    AddCollectionDarkblockQuestion,
    UpdateDateCommand,
    UpdateDateQuestions,
    TransactionService,
    DelegateCreatorCommand,
    DelegateCreatorQuestions,
    SyncCollectionQuestions,
    SyncCollectionCommand,
    DeleteCandyMachineCommand,
    DeleteCandyMachineQuestions,
    SyncListingsCommand,
    SyncListingsQuestions,
    AuctionHouseService,
    CreateNonceQuestions,
    CreateNonceCommand,
    NonceService,
    SyncCoreAssetCommand,
    SyncCoreAssetsQuestions,
    UpdateNonceCommand,
    UpdateNonceQuestions,
    InsertItemsCommand,
    InsertItemsQuestions,
    FetchCollectionSaleDetailsCommand,
    FetchCollectionSaleDetailsQuestions,
    UpdateCMGroupPriceCommand,
    UpdateCMGroupPriceQuestions,
    DiscordService,
    SyncMintReceptsCommand,
    VaultTransferCommand,
    VaultTransferQuestions,
  ],
})
export class CLIModule {}
