import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { WalletService } from '../wallet/wallet.service';

@Module({
  controllers: [UserController],
  providers: [UserService, HeliusService, WebSocketGateway, WalletService],
})
export class UserModule {}
