import { Module } from '@nestjs/common';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { WebSocketGateway } from 'src/websockets/websocket.gateway';
import { CandyMachineController } from './candy-machine.controller';
import { CandyMachineService } from './candy-machine.service';
import { NonceService } from 'src/nonce/nonce.service';

@Module({
  controllers: [CandyMachineController],
  providers: [
    CandyMachineService,
    HeliusService,
    WebSocketGateway,
    NonceService,
  ],
})
export class CandyMachineModule {}
