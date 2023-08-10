import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { WalletService } from '../wallet/wallet.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    WalletService,
    PasswordService,
    MailService,
    HeliusService,
    WebSocketGateway,
    AuthService,
    JwtService,
  ],
})
export class UserModule {}
