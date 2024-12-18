import { Module } from '@nestjs/common';
import { HeliusModule } from './helius/helius.module';
import { TensorModule } from './tensor/tensor.module';

@Module({
  imports: [HeliusModule, TensorModule],
  exports: [HeliusModule, TensorModule],
})
export class WebhooksModule {}
