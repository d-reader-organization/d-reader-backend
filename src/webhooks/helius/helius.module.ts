import { Module } from '@nestjs/common';
import { HeliusService } from './helius.service';
import { HeliusController } from './helius.controller';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';

@Module({
  controllers: [HeliusController],
  providers: [HeliusService, WebSocketGateway],
})
export class HeliusModule {}
