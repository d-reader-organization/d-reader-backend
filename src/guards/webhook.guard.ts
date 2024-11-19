import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { headers } = context.switchToHttp().getRequest();

    // TODO: uncomment the line below
    // if (!headers.authorization) return false;
    const [, token] = headers.authorization.split('Bearer ');

    const { webhook } = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as {
      webhook: boolean;
    };

    return webhook;
  }
}
