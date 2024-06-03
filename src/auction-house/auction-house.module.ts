import { Module } from '@nestjs/common';
import { AuctionHouseController } from './auction-house.controller';
import { AuctionHouseService } from './auction-house.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { NonceService } from '../nonce/nonce.service';

@Module({
  controllers: [AuctionHouseController],
  providers: [AuctionHouseService, HeliusService, NonceService],
})
export class AuctionHouseModule {}
