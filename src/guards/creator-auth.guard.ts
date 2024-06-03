import {
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UNAUTHORIZED_MESSAGE } from '../constants';
import { Request } from '../types/request';

@Injectable()
export class CreatorAuthGuard extends AuthGuard('jwt') {
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
    const creator = request.user;
    if (!creator) return false;
    if (creator.type !== 'creator') return false;

    return parentCanActivate;
  }
}

export function CreatorAuth() {
  return applyDecorators(
    UseGuards(CreatorAuthGuard),
    ApiBearerAuth('JWT-creator'),
  );
}
