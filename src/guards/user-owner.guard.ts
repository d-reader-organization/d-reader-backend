import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Request } from 'src/types/request';
import { Role } from '@prisma/client';
import { UserAuth } from './user-auth.guard';

/** Protects endpoints against non-owners of the User entity */
@Injectable()
export class UserUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user: requestUser, params } = request;
    const { id } = params;

    if (!id) return true;
    if (!requestUser) return false;
    if (requestUser.type !== 'user') return false;

    const user = await this.prisma.user.findUnique({
      where: { id: +id },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    } else if (user.role === Role.Superadmin) {
      throw new ForbiddenException('Cannot update user with Superadmin role');
    } else if (requestUser.role === Role.Superadmin) return true;
    else if (requestUser.id === user.id) return true;
    else throw new ForbiddenException("You don't own this user");
  }
}

export function UserOwnerAuth() {
  return applyDecorators(UserAuth(), UseGuards(UserUpdateGuard));
}
