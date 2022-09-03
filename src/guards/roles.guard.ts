import {
  CanActivate,
  CustomDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { TokenPayload } from 'src/auth/dto/authorization.dto';

export interface Request extends ExpressRequest {
  user?: TokenPayload;
}

export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) return false;

    return roles.includes(user.role);
  }
}
