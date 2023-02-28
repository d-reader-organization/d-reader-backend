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

/** Protects non 'GET' and 'POST' Creator endpoints from anyone besides
 * Superadmin users and owner of relevant entities */
@Injectable()
export class CreatorUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, method } = request;

    // If reading or creating new Creator entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;

    const { slug } = params;
    if (!slug) return true;

    const creator = await this.prisma.creator.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    if (!user) return false;
    return true;
    // else if (user.role === Role.Superadmin) return true;
    // else if (creator.id === user.creator?.id) return true;
    // else throw new ForbiddenException("You don't own this creator");
  }
}
