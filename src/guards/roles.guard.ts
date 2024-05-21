import {
  CanActivate,
  CustomDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'src/types/request';
import { Role } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

export const Roles = (...roles: Role[]): CustomDecorator<string> => {
  return SetMetadata('roles', roles);
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!roles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) return false;

    if (!!roles.includes(user.role)) return true;
    else {
      throw new ForbiddenException('You do not have the required role');
    }
  }
}

export function AdminGuard() {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), RolesGuard),
    Roles(Role.Superadmin, Role.Admin),
    ApiBearerAuth('JWT-user'),
  );
}
