import { Module } from '@nestjs/common';
import { AuctionHouseService } from 'src/vendors/auction-house.service';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { PlaygroundController } from './playground.controller';

@Module({
  controllers: [PlaygroundController],
  providers: [CandyMachineService, AuctionHouseService],
})
export class PlaygroundModule {}
