import { Module } from '@nestjs/common';
import { TensorSocketGateway } from './tensor.gateway';
import { HeliusService } from '../helius/helius.service';
import { NonceService } from '../../nonce/nonce.service';

@Module({
  providers: [TensorSocketGateway, HeliusService, NonceService],
})
export class TensorModule {}
