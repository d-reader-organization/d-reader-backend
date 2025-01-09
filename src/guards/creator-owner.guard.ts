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
import { CreatorAuth } from './creator-auth.guard';

/** Protects endpoints against non-owners of the Creator entity */
@Injectable()
export class CreatorOwnerGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;
    const { handle } = params;

    if (!user) return false;
    if (!handle) return false;
    if (user.role !== 'Creator') return false;

    const creator = await this.prisma.creatorChannel.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with handle ${handle} not found`);
    } else if (creator.id === user.id) return true;
    else throw new ForbiddenException("You don't own this creator profile");
  }
}

export function CreatorOwnerAuth() {
  return applyDecorators(CreatorAuth(), UseGuards(CreatorOwnerGuard));
}
