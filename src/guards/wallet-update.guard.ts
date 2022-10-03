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

type WalletIdParamInput = {
  key: keyof Prisma.WalletWhereUniqueInput;
  type: 'number' | 'string';
};

/** Checks whether a request.user actually owns the specified Wallet */
export const WalletIdParam = (
  param: WalletIdParamInput,
): CustomDecorator<string> => SetMetadata('walletIdParam', param);

@Injectable()
export class WalletUpdateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;

    const idParam = this.reflector.get<WalletIdParamInput>(
      'walletIdParam',
      context.getHandler(),
    );
    if (!idParam) return false;

    const id = params[idParam.key];
    if (!id) return false;

    const wallet = await this.prisma.wallet.findUnique({
      where: { [idParam.key]: idParam.type === 'number' ? +id : id },
      select: { id: true, role: true },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet with ${idParam.key} ${id} does not exist`,
      );
    }

    if (!user) return false;
    else if (wallet.role === Role.Superadmin) {
      throw new ForbiddenException('Cannot update wallet with Superadmin role');
    } else if (user.role === Role.Superadmin) return true;
    else if (user.id === wallet.id) return true;
    else throw new ForbiddenException("You don't own this wallet");
  }
}
