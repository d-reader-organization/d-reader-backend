import { Controller, Delete, Get, Query } from '@nestjs/common';
import { MintParams } from '../candy-machine/dto/mint-params.dto';
import { ApiTags } from '@nestjs/swagger';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AdminGuard } from 'src/guards/roles.guard';
import { MINUTE_SECONDS } from 'src/constants';
import { CleanQueueParams } from './dto/clean-queue.params';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
  constructor(
    @InjectQueue('requestsQueue') private readonly requestsQueue: Queue,
  ) {}

  @OptionalUserAuth()
  @Get('/mint')
  async addInQueue(
    @Query() query: MintParams,
    @UserEntity() user?: UserPayload,
  ) {
    const job = await this.requestsQueue.add({ query, user });
    return job.id;
  }

  @AdminGuard()
  @Delete('/clean')
  async cleanQueue(@Query() query: CleanQueueParams) {
    const status = query.status || 'completed';
    await this.requestsQueue.clean(MINUTE_SECONDS * 1000, status);
  }
}
