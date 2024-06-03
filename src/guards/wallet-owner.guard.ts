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
import { Role } from '@prisma/client';
import { UserAuth } from './user-auth.guard';

/** Protects endpoints against non-owners of the Wallet entity */
@Injectable()
export class WalletUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user: requestUser, params } = request;
    const { address } = params;

    if (!address) return true;
    if (!requestUser) return false;
    if (requestUser.type !== 'user') return false;

    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
    });

    if (!address) {
      throw new NotFoundException(`Wallet with address ${address} not found`);
    } else if (requestUser.role === Role.Superadmin) return true;
    else if (requestUser.id === wallet.userId) return true;
    else throw new ForbiddenException("You don't own this wallet");
  }
}

export function WalletOwnerAuth() {
  return applyDecorators(UserAuth(), UseGuards(WalletUpdateGuard));
}
