import { Module } from '@nestjs/common';
import { AuctionHouseService } from 'src/vendors/auction-house.service';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { PlaygroundController } from './playground.controller';

@Module({
  controllers: [PlaygroundController],
  providers: [CandyMachineService, AuctionHouseService, HeliusService],
})
export class PlaygroundModule {}
