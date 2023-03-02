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

/** Protects non 'GET' and 'POST' ComicIssue endpoints from anyone besides
 * Superadmin users and owner of relevant entities */
@Injectable()
export class ComicIssueUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, method, path } = request;

    // If reading or creating new Creator entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;
    else if (path.includes('/comic-issue/favouritise')) {
      return true;
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
