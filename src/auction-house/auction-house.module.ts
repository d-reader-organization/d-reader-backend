import { Module } from '@nestjs/common';
import { AuctionHouseController } from './auction-house.controller';
import { AuctionHouseService } from './auction-house.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';

@Module({
  controllers: [AuctionHouseController],
  providers: [AuctionHouseService, HeliusService, WebSocketGateway],
})
export class AuctionHouseModule {}
