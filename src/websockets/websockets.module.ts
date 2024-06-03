import { Global, Module } from '@nestjs/common';
import { WebSocketController } from './websocket.controller';
import { WebSocketGateway } from './websocket.gateway';

@Global()
@Module({
  controllers: [WebSocketController],
  providers: [WebSocketGateway],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
