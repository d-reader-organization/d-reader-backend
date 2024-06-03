import { Module } from '@nestjs/common';
import { HeliusService } from './helius.service';
import { HeliusController } from './helius.controller';
import { NonceService } from '../../nonce/nonce.service';

@Module({
  controllers: [HeliusController],
  providers: [HeliusService, NonceService],
})
export class HeliusModule {}
