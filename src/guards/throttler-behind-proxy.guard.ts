import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { getClientIp } from 'request-ip';
import { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    console.log('user agent: ', req['User-Agent']);
    const clientIp = getClientIp(req);
    console.log(`DEBUG: throttler ip: ${clientIp}`);
    console.log(`DEBUG: headers: ${req.headers}`);
    return clientIp;
  }
}
