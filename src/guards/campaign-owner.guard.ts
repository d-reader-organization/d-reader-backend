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
import { processCampaignIdString } from 'src/utils/campaign';

/** Protects endpoints against non-owners of the Campaign entity */
@Injectable()
export class CampaignUpdateGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, params } = request;
    const { id } = params;

    if (!user) return false;
    if (!id) return false;
    if (user.role == 'Admin') return true;
    if (user.role !== 'Creator') return false;

    const where = processCampaignIdString(id);
    const campaign = await this.prisma.campaign.findUnique({
      where,
      select: { creator: { select: { userId: true } } },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with id ${id} not found`);
    } else if (campaign.creator.userId === user.id) return true;
    else throw new ForbiddenException("You don't own this campaign");
  }
}

export function CampaignOwnerAuth() {
  return applyDecorators(CreatorAuth(), UseGuards(CampaignUpdateGuard));
}
