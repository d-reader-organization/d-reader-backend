import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Request } from 'src/types/request';
import { Role } from '@prisma/client';

/** Protects non 'GET' Candy Machine endpoints from
 * anyone besides Superadmin users */
@Injectable()
export class CandyMachineUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, method } = request;

    // If reading or Candy Machine entities, allow
    if (method.toLowerCase() === 'get') return true;
    else if (!user) return false;
    else if (user.role === Role.Superadmin) return true;
    else
      throw new ForbiddenException(
        'Only Superadmins can create/update candy machines',
      );
  }
}
