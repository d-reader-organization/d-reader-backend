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
import { Reflector } from '@nestjs/core';
import { SKIP_UPDATE_GUARD } from './skip-update-guard';

/** Protects 'PUT' and 'PATCH' Comic endpoints
 * from anyone besides its creators and Superadmin */
@Injectable()
export class ComicUpdateGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, method } = request;
    const { slug } = params;
    if (!user) return false;
    if (!slug) return true;

    // If reading or creating new Creator entities, allow
    // Allow PUT and PATCH requests on endpoints with @SkipUpdateGuard
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;
    else if (
      method.toLocaleLowerCase() === 'patch' ||
      method.toLocaleLowerCase() === 'put'
    ) {
      const skipUpdateGuard = this.reflector.get<boolean>(
        SKIP_UPDATE_GUARD,
        context.getHandler(),
      );
      if (skipUpdateGuard) return true;
    }

    const comic = await this.prisma.comic.findUnique({
      where: { slug },
      select: { creatorId: true },
    });

    if (!comic) {
      throw new NotFoundException(`Comic with slug ${slug} not found`);
    } else if (comic.creatorId === user.id) return true;
    else throw new ForbiddenException("You don't own this comic");
  }
}
