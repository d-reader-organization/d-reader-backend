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

/** Protects 'PUT' and 'PATCH' ComicIssue endpoints
 * from anyone besides its creators and Superadmin */
@Injectable()
export class ComicIssueCreatorUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const { user, params, method } = request;
    const { id } = params;

    if (!user) return false;
    if (!id) return false;
    if (user.type !== 'creator') return false;

    // If reading or creating new ComicIssue entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: +id },
      select: { comic: { select: { creatorId: true } } },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} not found`);
    } else if (comicIssue.comic.creatorId === user.id) return true;
    else throw new ForbiddenException("You don't own this comic issue");
  }
}
