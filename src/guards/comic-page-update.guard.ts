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

type ComicPageIdParamInput = {
  key: keyof Prisma.ComicPageWhereUniqueInput;
  type: 'number' | 'string';
};

/** Checks whether a request.user actually owns the specified Comic Page */
export const ComicPageIdParam = (
  param: ComicPageIdParamInput = { key: 'id', type: 'number' },
): CustomDecorator<string> => SetMetadata('comicPageIdParam', param);

@Injectable()
export class ComicPageUpdateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;

    const idParam = this.reflector.get<ComicPageIdParamInput>(
      'comicPageIdParam',
      context.getHandler(),
    );
    if (!idParam) return true;

    const id = params[idParam.key];
    if (!id) return true;

    const comicPage = await this.prisma.comicPage.findUnique({
      where: { [idParam.key]: idParam.type === 'number' ? +id : id },
      select: { comicIssue: { select: { comic: true } } },
    });

    if (!user) return false;
    else if (user.role === Role.Superadmin) return true;
    else if (comicPage.comicIssue.comic.creatorId === user.creator.id)
      return true;
    else throw new ForbiddenException("You don't own this comic page");
  }
}
