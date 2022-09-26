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

type CreatorIdParamInput = {
  key: keyof Prisma.CreatorWhereUniqueInput;
  type: 'number' | 'string';
};

/** Checks whether a request.user actually owns the specified Creator */
export const CreatorIdParam = (
  param: CreatorIdParamInput,
): CustomDecorator<string> => SetMetadata('creatorIdParam', param);

@Injectable()
export class CreatorUpdateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;

    const idParam = this.reflector.get<CreatorIdParamInput>(
      'creatorIdParam',
      context.getHandler(),
    );
    if (!idParam) return true;

    const id = params[idParam.key];
    if (!id) return true;

    const creator = await this.prisma.creator.findUnique({
      where: { [idParam.key]: idParam.type === 'number' ? +id : id },
      select: { id: true },
    });

    if (!user) return false;
    else if (user.role === Role.Superadmin) return true;
    else if (creator.id === user.creator.id) return true;
    else throw new ForbiddenException("You don't own this creator");
  }
}
