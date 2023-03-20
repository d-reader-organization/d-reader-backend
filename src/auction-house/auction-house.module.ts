import { Module } from '@nestjs/common';
import { AuctionHouseController } from './auction-house.controller';
import { AuctionHouseService } from './auction-house.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';

@Module({
  controllers: [AuctionHouseController],
  providers: [AuctionHouseService, HeliusService, WebSocketGateway],
})
export class AuctionHouseModule {}
