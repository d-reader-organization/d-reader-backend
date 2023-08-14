import {
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { Request } from '../types/request';
import { UNAUTHORIZED_MESSAGE } from '../constants';

@Injectable()
@ApiBearerAuth('JWT-user')
export class UserAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let parentCanActivate = false;
    try {
      parentCanActivate = (await super.canActivate(context)) as boolean;
    } catch (error: any) {
      const isHttpException = error instanceof HttpException;
      if (isHttpException) {
        // If it's a default 'Unauthorized' error, give it a more descriptive message
        if (error.message === 'Unauthorized' && error.getStatus() === 401) {
          throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
      }
      throw error;
    }

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
