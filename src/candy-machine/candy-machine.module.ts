import { Module } from '@nestjs/common';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { CandyMachineController } from './candy-machine.controller';
import { CandyMachineService } from './candy-machine.service';
import { DarkblockService } from './darkblock.service';
import { NonceService } from '../nonce/nonce.service';

@Module({
  controllers: [CandyMachineController],
  providers: [
    CandyMachineService,
    HeliusService,
    WebSocketGateway,
    DarkblockService,
    NonceService,
  ],
  exports: [CandyMachineService, DarkblockService],
})
export class CandyMachineModule {}
