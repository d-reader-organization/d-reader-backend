import { Module } from '@nestjs/common';
import { AuctionHouseService } from 'src/vendors/auction-house.service';
import { CandyMachineService } from 'src/vendors/candy-machine.service';
import { MetaplexService } from 'src/vendors/metaplex.service';
import { PlaygroundController } from './playground.controller';

@Module({
  controllers: [PlaygroundController],
  providers: [MetaplexService, CandyMachineService, AuctionHouseService],
})
export class PlaygroundModule {}
