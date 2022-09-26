import {
  CanActivate,
  CustomDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'src/types/request';

export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const wallet = request.user;
    if (!wallet) return false;

    if (!!roles.includes(wallet.role)) return true;
    else {
      throw new ForbiddenException('You do not have the required role');
    }
  }
}
