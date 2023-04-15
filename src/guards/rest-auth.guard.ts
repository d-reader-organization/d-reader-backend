import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RestAuthGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { url } = context.switchToHttp().getRequest<Request>();
    if (url === '/helius/handle') return true;

    return super.canActivate(context);
  }
}
