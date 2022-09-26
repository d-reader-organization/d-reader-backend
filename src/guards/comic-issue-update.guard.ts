import {
  CanActivate,
  CustomDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'nestjs-prisma';
import { Request } from 'src/types/request';
import { Prisma, Role } from '@prisma/client';

type ComicIssueIdParamInput = {
  key: keyof Prisma.ComicIssueWhereUniqueInput;
  type: 'number' | 'string';
};

/** Checks whether a request.user actually owns the specified Comic Issue */
export const ComicIssueIdParam = (
  param: ComicIssueIdParamInput = { key: 'id', type: 'number' },
): CustomDecorator<string> => SetMetadata('comicIssueIdParam', param);

@Injectable()
export class ComicIssueUpdateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;

    const idParam = this.reflector.get<ComicIssueIdParamInput>(
      'comicIssueIdParam',
      context.getHandler(),
    );
    if (!idParam) return true;

    const id = params[idParam.key];
    if (!id) return true;

    const comicIssue = await this.prisma.comicIssue.findUnique({
      where: { [idParam.key]: idParam.type === 'number' ? +id : id },
      select: { comic: { select: { creatorId: true } } },
    });

    if (!user) return false;
    else if (user.role === Role.Superadmin) return true;
    else if (comicIssue.comic.creatorId === user.creator.id) return true;
    else throw new ForbiddenException("You don't own this comic issue");
  }
}
