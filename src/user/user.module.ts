import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { WalletService } from '../wallet/wallet.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    WalletService,
    PasswordService,
    MailService,
    HeliusService,
    WebSocketGateway,
  ],
})
export class UserModule {}
