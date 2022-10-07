import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  @Cron(CronExpression.EVERY_5_MINUTES)
  dummyTask() {
    console.log('Dummy task fired');
  }
}
