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

/** Protects 'PUT' ComicIssue endpoints from anyone
 * besides Superadmin users and its creators */
@Injectable()
export class ComicIssueUpdateGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const { user, params, method } = request;

    // If reading or creating new ComicIssue entities, allow
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

    const { id } = params;
    if (!id) return true;

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: +id },
      select: { comic: { select: { creatorId: true } } },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} does not exist`);
    }

    if (!user) return false;
    else if (user.role === Role.Superadmin) return true;
    else if (comicIssue.comic.creatorId === user.creator?.id) return true;
    else throw new ForbiddenException("You don't own this comic issue");
  }
}
