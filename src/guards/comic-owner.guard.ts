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

/** Protects endpoints against non-owners of the Comic entity */
@Injectable()
export class ComicUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user: creator, params } = request;
    const { slug } = params;

    if (!creator) return false;
    if (!slug) return false;
    if (creator.type !== 'creator') return false;

    const comic = await this.prisma.comic.findUnique({
      where: { slug },
      select: { creatorId: true },
    });

    if (!comic) {
      throw new NotFoundException(`Comic with slug ${slug} not found`);
    } else if (comic.creatorId === creator.id) return true;
    else throw new ForbiddenException("You don't own this comic");
  }
}

export function ComicOwnerAuth() {
  return applyDecorators(CreatorAuth(), UseGuards(ComicUpdateGuard));
}
