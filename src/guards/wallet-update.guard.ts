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

/** Protects 'PUT' and 'PATCH' Wallet endpoints
 * from anyone besides the wallet owners and Superadmin */
@Injectable()
export class WalletUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params, method } = request;
    const { address } = params;
    if (!user) return false;
    if (!address) return true;

    // If reading or creating new Wallet entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (method.toLowerCase() === 'post') return true;

    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
      select: { address: true, userId: true },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet ${address} not found`);
    } else if (user.role === Role.Superadmin) return true;
    else if (user.id === wallet.userId) return true;
    else throw new ForbiddenException("You don't own this wallet");
  }
}
