import { HttpException } from '@nestjs/common';

export class GlobalRateLimitExceededException extends HttpException {
  constructor() {
    super(
      'Too many users requesting this resource, please try again in a few seconds',
      999,
    );
  }
}
