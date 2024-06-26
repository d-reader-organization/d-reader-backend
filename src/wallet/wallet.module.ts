import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineModule } from '../candy-machine/candy-machine.module';
import { NonceService } from '../nonce/nonce.service';

@Module({
  imports: [CandyMachineModule],
  controllers: [WalletController],
  providers: [WalletService, HeliusService, NonceService],
  exports: [WalletService],
})
export class WalletModule {}
