import { Module } from '@nestjs/common';
import { WorkerPool } from './workerPool.service';

@Module({
  providers: [WorkerPool],
  exports: [WorkerPool],
})
export class WorkerPoolModule {}
