import { JobStatusClean } from 'bull';
import { IsIn, IsString } from 'class-validator';

export class CleanQueueParams {
  @IsString()
  @IsIn(['completed', 'wait', 'active', 'delayed', 'failed', 'paused'])
  status?: JobStatusClean;
}
