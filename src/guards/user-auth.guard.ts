import { ExecutionContext, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { Request } from '../types/request';

@Injectable()
@ApiBearerAuth('JWT-user')
export class UserAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const parentCanActivate = (await super.canActivate(context)) as boolean;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) return false;
    if (user.type !== 'user') return false;

    return parentCanActivate;
  }
}

export function UserAuth() {
  return applyDecorators(UseGuards(UserAuthGuard), ApiBearerAuth('JWT-user'));
}
