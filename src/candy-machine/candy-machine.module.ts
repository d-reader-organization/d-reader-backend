import { Module } from '@nestjs/common';
import { CandyMachineController } from './candy-machine.controller';
import { CandyMachineService } from './candy-machine.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';

@Module({
  controllers: [CandyMachineController],
  providers: [CandyMachineService, HeliusService],
})
export class CandyMachineModule {}
