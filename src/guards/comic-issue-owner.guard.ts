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
import { CreatorAuth } from './creator-auth.guard';

/** Protects endpoints against non-owners of the Comic Issue entity */
@Injectable()
export class ComicIssueOwnerAuthGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;
    const { id } = params;

    if (!user) return false;
    if (!id) return false;
    if (user.role !== 'Creator') return false;

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { id: +id },
      select: { comic: { select: { creator: { select: { userId: true } } } } },
    });

    if (!comicIssue) {
      throw new NotFoundException(`Comic issue with id ${id} not found`);
    } else if (comicIssue.comic.creator.userId === user.id) return true;
    else throw new ForbiddenException("You don't own this comic issue");
  }
}

export function ComicIssueOwnerAuth() {
  return applyDecorators(CreatorAuth(), UseGuards(ComicIssueOwnerAuthGuard));
}
