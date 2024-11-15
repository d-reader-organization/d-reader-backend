import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { getClientIp } from 'request-ip';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    const clientIp = getClientIp(req);

    console.log(`DEBUG: throttler ip: ${clientIp}`);

    return clientIp;
  }
}
