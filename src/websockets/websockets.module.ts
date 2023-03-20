import { Module } from '@nestjs/common';
import { WebSocketController } from './websocket.controller';
import { WebSocketGateway } from './websocket.gateway';

@Module({
  controllers: [WebSocketController],
  providers: [WebSocketGateway],
})
export class WebSocketModule {}
