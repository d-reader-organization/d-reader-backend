import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { Request } from '../types/request';
import { PrismaService } from 'nestjs-prisma';
import { UserAuth } from './user-auth.guard';

@Injectable()
@ApiBearerAuth('JWT-user')
export class VerfiedUserAuthGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user: requestUser, params } = request;
    const { id } = params;

    if (!id) return true;
    if (!requestUser) return false;
    if (requestUser.type !== 'user') return false;

    const user = await this.prisma.user.findUnique({ where: { id: +id } });
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(`User with id ${id} is not verified`);
    }
  }
}

export function VerifiedUserAuth() {
  return applyDecorators(UserAuth(), UseGuards(VerfiedUserAuthGuard));
}
