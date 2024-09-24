import { Module } from '@nestjs/common';
import { MutexService } from './mutex.service';

@Module({
  providers: [MutexService],
})
export class MutexModule {}
