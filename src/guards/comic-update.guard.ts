import {
  CanActivate,
  CustomDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'nestjs-prisma';
import { Request } from 'src/types/request';
import { Prisma, Role } from '@prisma/client';

type ComicIdParamInput = {
  key: keyof Prisma.ComicWhereUniqueInput;
  type: 'number' | 'string';
};

/** Checks whether a request.user actually owns the specified Comic */
export const ComicIdParam = (
  param: ComicIdParamInput,
): CustomDecorator<string> => SetMetadata('comicIdParam', param);

@Injectable()
export class ComicUpdateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;

    const idParam = this.reflector.get<ComicIdParamInput>(
      'comicIdParam',
      context.getHandler(),
    );
    if (!idParam) return true;

    const id = params[idParam.key];
    if (!id) return true;

    const comic = await this.prisma.comic.findUnique({
      where: { [idParam.key]: idParam.type === 'number' ? +id : id },
      select: { creatorId: true },
    });

    if (!comic) {
      throw new NotFoundException(
        `Comic with ${idParam.key} ${id} does not exist`,
      );
    }

    if (!user) return false;
    else if (user.role === Role.Superadmin) return true;
    else if (comic.creatorId === user.creator?.id) return true;
    else throw new ForbiddenException("You don't own this comic");
  }
}
