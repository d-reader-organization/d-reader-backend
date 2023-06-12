import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';

@Module({
  controllers: [WalletController],
  providers: [WalletService, HeliusService, WebSocketGateway],
})
export class WalletModule {}
