import { Module } from '@nestjs/common';
import { AuctionHouseController } from './auction-house.controller';
import { AuctionHouseService } from './auction-house.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';

@Module({
  controllers: [AuctionHouseController],
  providers: [AuctionHouseService, HeliusService],
})
export class AuctionHouseModule {}
