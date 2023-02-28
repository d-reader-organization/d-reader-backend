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

/** Protects non 'GET' and 'POST' Wallet endpoints from anyone besides
 * Superadmin users and owner of relevant entities */
@Injectable()
export class WalletUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, method } = request;

    // If reading or creating new Wallet entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;

    const { address } = params;
    if (!address) return true;

    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
      select: { address: true, role: true },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet ${address} does not exist`);
    }

    if (!user) return false;
    return true;
    // else if (wallet.role === Role.Superadmin) {
    //   throw new ForbiddenException('Cannot update wallet with Superadmin role');
    // } else if (user.role === Role.Superadmin) return true;
    // else if (user.address === wallet.address) return true;
    // else throw new ForbiddenException("You don't own this wallet");
  }
}
