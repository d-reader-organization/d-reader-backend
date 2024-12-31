import { Module } from '@nestjs/common';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineController } from './candy-machine.controller';
import { CandyMachineService } from './candy-machine.service';
import { NonceService } from '../nonce/nonce.service';

@Module({
  controllers: [CandyMachineController],
  providers: [CandyMachineService, HeliusService, NonceService],
  exports: [CandyMachineService],
})
export class CandyMachineModule {}
