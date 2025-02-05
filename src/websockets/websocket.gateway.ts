import { Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway as WebSocketGatewayDecorator,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  CollectibleComicMintEventInput,
  toCollectibleComicMintEventDto,
} from '../webhooks/helius/dto/assetMintEvent.dto';
import { RoomData } from './dto/types';
import {
  ActivityNotificationInput,
  toActivityNotificationDto,
} from './dto/activity-notification.dto';
import { WEBSOCKET_EVENTS, WEBSOCKET_ROOMS } from '../utils/websockets';

@Injectable()
@WebSocketGatewayDecorator({ cors: true })
export class WebSocketGateway {
  @WebSocketServer() server: Server;

  // TODO: add new client and/or comic-issue whenever someone starts listening?
  // @SubscribeMessage('comic-issue/${id}')
  // https://wanago.io/2021/01/25/api-nestjs-chat-websockets/

  handleWave() {
    this.server.sockets.emit(
      WEBSOCKET_EVENTS.WAVE,
      'Hello world ' + Math.random().toFixed(4),
    );
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.JOIN_ROOM)
  async handleJoinRoom(
    @MessageBody() data: RoomData,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = data.roomId ?? data.walletAddress;
    await client.join(roomId);
    console.log(`Socket ${client.id} joined room: ${roomId}`);
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.LEAVE_ROOM)
  async handleLeaveRoom(
    @MessageBody() data: RoomData,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = data.roomId ?? data.walletAddress;
    await client.leave(roomId);
    console.log(`Socket ${client.id} left room: ${roomId}`);
  }

  async handleWalletCollectibleComicMinted(
    data: CollectibleComicMintEventInput,
  ) {
    const receiptDto = await toCollectibleComicMintEventDto(data);
    const walletAddress = data.buyerAddress;

    return this.server
      .to(WEBSOCKET_ROOMS.WALLET(walletAddress))
      .emit(WEBSOCKET_EVENTS.WALLET_ITEM_MINTED(walletAddress), receiptDto);
  }

  handleActivityNotification(data: ActivityNotificationInput) {
    const activityNotificationDto = toActivityNotificationDto(data);

    return this.server
      .to(WEBSOCKET_ROOMS.ACTIVITY)
      .emit(WEBSOCKET_EVENTS.ACTIVITY_NOTIFICATION, activityNotificationDto);
  }
}
