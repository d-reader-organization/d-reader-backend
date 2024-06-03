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

/** Protects endpoints against non-owners of the Comic Issue entity.
 * Also doesn't allow to edit draft comic issue sales data for non-owners
 */
@Injectable()
export class DraftComicIssueSalesDataGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, body } = request;
    const { id } = params;
    const { comicIssueId } = body;

    if (!user) return false;
    if (!id && !comicIssueId) return false;
    if (user.type !== 'creator') return false;

    const checkForComicIssueOwner = async (id: number) => {
      const comicIssue = await this.prisma.comicIssue.findUnique({
        where: { id },
        select: { comic: { select: { creatorId: true } } },
      });

      if (!comicIssue) {
        throw new NotFoundException(`Comic issue with id ${id} not found`);
      } else if (comicIssue.comic.creatorId === user.id) return true;
      else {
        throw new ForbiddenException("You don't own this comic issue");
      }
    };

    if (comicIssueId) {
      return await checkForComicIssueOwner(comicIssueId);
    }

    const draftComicIssueSalesData =
      await this.prisma.draftComicIssueSalesData.findUnique({
        where: {
          id: +id,
        },
      });
    if (!draftComicIssueSalesData) {
      throw new NotFoundException(
        `Draft Comic issue sales data with id ${id} not found`,
      );
    }
    return await checkForComicIssueOwner(draftComicIssueSalesData.comicIssueId);
  }
}

export function DraftComicIssueSalesDataAuth() {
  return applyDecorators(
    CreatorAuth(),
    UseGuards(DraftComicIssueSalesDataGuard),
  );
}
