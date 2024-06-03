import {
  ExecutionContext,
  HttpException,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

@Injectable()
@ApiBearerAuth('JWT-user')
export class OptionalUserAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let parentCanActivate = false;
    try {
      parentCanActivate = (await super.canActivate(context)) as boolean;
    } catch (error: any) {
      const isHttpException = error instanceof HttpException;
      if (isHttpException) {
        // If it's a default 'Unauthorized' error, give it a more descriptive message
        if (error.message === 'Unauthorized' && error.getStatus() === 401) {
          return true;
        }
      }
      throw error;
    }

    return parentCanActivate;
  }
}

export function OptionalUserAuth() {
  return applyDecorators(
    UseGuards(OptionalUserAuthGuard),
    ApiBearerAuth('JWT-user'),
  );
}
