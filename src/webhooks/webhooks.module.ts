import { Module } from '@nestjs/common';
import { HeliusModule } from './helius/helius.module';

@Module({
  imports: [HeliusModule],
})
export class WebhooksModule {}
