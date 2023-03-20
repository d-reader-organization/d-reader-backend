import { Controller, Get } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Websocket')
@Controller('websocket')
export class WebSocketController {
  constructor(private readonly webSocketGateway: WebSocketGateway) {}

  /* Test endpoint */
  @Get('send-message')
  get(): void {
    return this.webSocketGateway.handleMessage(
      'Message sent ' + Math.random().toFixed(4),
    );
  }
}
