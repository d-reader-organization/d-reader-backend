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
import { UserAuth } from './user-auth.guard';

/** Protects endpoints against non-verified Users */
@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user: requestUser } = request;

    if (!requestUser) return false;
    if (requestUser.type !== 'user') return false;

    const user = await this.prisma.user.findUnique({
      where: { id: requestUser.id },
      select: { id: true, emailVerifiedAt: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${requestUser.id} not found`);
    } else if (!user.emailVerifiedAt) {
      throw new ForbiddenException(`User with id ${user.id} is not verified`);
    } else if (requestUser.id === user.id) return true;
  }
}

export function VerifiedUserAuthGuard() {
  return applyDecorators(UserAuth(), UseGuards(VerifiedUserGuard));
}
