import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { CandyMachineModule } from '../candy-machine/candy-machine.module';

@Module({
  imports: [CandyMachineModule],
  controllers: [WalletController],
  providers: [WalletService, HeliusService, WebSocketGateway],
  exports: [WalletService],
})
export class WalletModule {}
