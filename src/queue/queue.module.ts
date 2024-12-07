import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueProcessor } from './queue.processor';
import { QueueController } from './queue.controller';
import { DarkblockService } from 'src/candy-machine/darkblock.service';
import { NonceService } from 'src/nonce/nonce.service';
import { HeliusService } from 'src/webhooks/helius/helius.service';
import { CandyMachineService } from 'src/candy-machine/candy-machine.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'requestsQueue', // The queue name
      redis: {
        host: 'localhost',
        port: 6379, // Your Redis server (can use Redis Cloud for production)
      },
      limiter: {
        groupKey: 'rateLimiter',
        max: 200, // Process 200 jobs per second
        duration: 1000,
      },
    }),
  ],
  controllers: [QueueController],
  providers: [
    QueueProcessor,
    DarkblockService,
    NonceService,
    HeliusService,
    CandyMachineService,
  ],
})
export class QueueModule {}
