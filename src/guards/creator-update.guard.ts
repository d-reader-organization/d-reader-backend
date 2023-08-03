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

/** Protects 'PUT' and 'PATCH' Creator endpoints
 * from anyone besides its creators and Superadmin */
@Injectable()
export class CreatorUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, method } = request;
    const { slug } = params;
    if (!user) return false;
    if (!slug) return true;

    // If reading or creating new Creator entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;

    const creator = await this.prisma.creator.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with slug ${slug} not found`);
    } else if (user.role === Role.Superadmin) return true;
    else if (creator.id === user.creator?.id) return true;
    else throw new ForbiddenException("You don't own this creator profile");
  }
}
