import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { AuctionHouseService } from '../auction-house/auction-house.service';
import { DarkblockService } from '../candy-machine/darkblock.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { TransactionService } from './transaction.service';
import { NonceService } from '../nonce/nonce.service';

@Module({
  controllers: [TransactionController],
  providers: [
    CandyMachineService,
    AuctionHouseService,
    TransactionService,
    HeliusService,
    DarkblockService,
    WebSocketGateway,
    NonceService,
  ],
})
export class TransactionModule {}
