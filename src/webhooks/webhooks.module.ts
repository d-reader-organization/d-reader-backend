import { Module } from '@nestjs/common';
import { HeliusModule } from './helius/helius.module';
import { TensorSocketGateway } from './tensor.gateway';

@Module({
  imports: [HeliusModule, TensorSocketGateway],
  exports: [HeliusModule],
})
export class WebhooksModule {}
