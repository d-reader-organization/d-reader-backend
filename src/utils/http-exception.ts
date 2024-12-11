import { HttpException } from '@nestjs/common';

export class GlobalRateLimitExceededException extends HttpException {
  constructor() {
    super('Server is in heavy load, try again in few seconds', 999);
  }
}
