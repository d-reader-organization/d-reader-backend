import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

@Injectable()
export class WebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { headers } = context.switchToHttp().getRequest<Request>();
    console.log('DEBUG: User agents ' + headers['user-agent']);

    if (!headers.authorization) return false;
    const [, token] = headers.authorization.split('Bearer ');

    const { webhook } = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as {
      webhook: boolean;
    };

    return webhook;
  }
}
