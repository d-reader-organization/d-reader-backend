import { Module } from '@nestjs/common';
import { HeliusService } from './helius.service';
import { HeliusController } from './helius.controller';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';
import { NonceService } from '../../nonce/nonce.service';

@Module({
  controllers: [HeliusController],
  providers: [HeliusService, WebSocketGateway, NonceService],
})
export class HeliusModule {}
