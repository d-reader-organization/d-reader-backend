import { Module } from '@nestjs/common';
import { HeliusService } from './helius.service';
import { HeliusController } from './helius.controller';

@Module({
  controllers: [HeliusController],
  providers: [HeliusService],
})
export class HeliusModule {}
