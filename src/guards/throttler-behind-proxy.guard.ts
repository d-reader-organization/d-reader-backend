import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { getClientIp } from 'request-ip';
import { isEqual } from 'lodash';
import { GlobalRateLimitExceededException } from '../utils/http-exception';
import { CREATE_MINT_TRANSACTION_PATH, GLOBAL_RATE_LIMIT } from '../constants';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  private globalMap = new Map<string, number>();

  async onModuleInit() {
    super.onModuleInit();

    setInterval(() => {
      this.globalMap.clear();
    }, 1000);
  }

  private trackGlobalLimit(req: Record<string, any>) {
    const path = req.route.path;
    if (isEqual(path, CREATE_MINT_TRANSACTION_PATH)) {
      const count = this.globalMap.get(path) || 0;

      if (count > GLOBAL_RATE_LIMIT) {
        throw new GlobalRateLimitExceededException();
      }

      this.globalMap.set(path, count + 1);
    }
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    this.trackGlobalLimit(req);

    const clientIp = getClientIp(req);
    return clientIp;
  }
}
