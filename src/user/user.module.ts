import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { WalletService } from '../wallet/wallet.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { CandyMachineModule } from '../candy-machine/candy-machine.module';
import { NonceService } from '../nonce/nonce.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';

@Module({
  imports: [CandyMachineModule],
  controllers: [UserController],
  providers: [
    UserService,
    WalletService,
    PasswordService,
    MailService,
    HeliusService,
    AuthService,
    JwtService,
    NonceService,
    WebSocketGateway,
  ],
})
export class UserModule {}
