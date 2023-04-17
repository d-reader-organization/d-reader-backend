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
import { Reflector } from '@nestjs/core';
import { SKIP_UPDATE_GUARD } from './skip-update-guard';

/** Protects 'PUT' Comic endpoints from anyone
 * besides Superadmin users and its creators */
@Injectable()
export class ComicUpdateGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, method } = request;

    // If reading or creating new Creator entities, allow
    // Allow PATCH requests on endpoints with @SkipUpdateGuard enabled
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;
    else if (method.toLocaleLowerCase() === 'patch') {
      const skipUpdateGuard = this.reflector.get<boolean>(
        SKIP_UPDATE_GUARD,
        context.getHandler(),
      );
      if (skipUpdateGuard) return true;
    }

    const { slug } = params;
    if (!slug) return true;

    const comic = await this.prisma.comic.findUnique({
      where: { slug },
      select: { creatorId: true },
    });

    if (!comic) {
      throw new NotFoundException(`Comic ${slug} does not exist`);
    }

    if (!user) return false;
    else if (user.role === Role.Superadmin) return true;
    else if (comic.creatorId === user.creator?.id) return true;
    else throw new ForbiddenException("You don't own this comic");
  }
}
