import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Request } from 'src/types/request';
import { Role } from '@prisma/client';

/** Protects 'PUT' and 'PATCH' User endpoints
 * from anyone besides the user itself and Superadmin */
@Injectable()
export class UserUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user: requestUser, params, method } = request;
    const { id } = params;
    if (!requestUser) return false;
    if (!id) return true;

    // If reading or creating new User entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;

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
