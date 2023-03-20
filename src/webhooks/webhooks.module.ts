import { Module } from '@nestjs/common';
import { HeliusModule } from './helius/helius.module';

@Module({
  imports: [HeliusModule],
  exports: [HeliusModule],
})
export class WebhooksModule {}
