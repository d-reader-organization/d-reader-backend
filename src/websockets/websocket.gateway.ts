import { Injectable } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  CandyMachineReceiptInput,
  toCMReceiptDto,
} from '../candy-machine/dto/candy-machine-receipt.dto';

@Injectable()
@WebSocketGatewayDecorator({ cors: true })
export class WebSocketGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('message')
  handleMessage(message: string): void {
    this.server.sockets.emit('message', message);
  }

  @SubscribeMessage('candyMachineReceiptCreated')
  async handleMintReceipt(receipt: CandyMachineReceiptInput): Promise<boolean> {
    const receiptDto = await toCMReceiptDto(receipt);
    return this.server.sockets.emit('candyMachineReceiptCreated', receiptDto);
  }
}
