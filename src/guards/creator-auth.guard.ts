import {
  ExecutionContext,
  Injectable,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'src/types/request';

@Injectable()
export class CreatorAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const parentCanActivate = (await super.canActivate(context)) as boolean;

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
