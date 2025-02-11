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
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.guard';
import { Role } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';


@Injectable()
export class AdminOrCreatorOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const roles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!roles) return false;

    const {
      user,
      query: { creatorId },
    } = request;
    if (!user) return false;
    if (user.role == 'Admin') return true;
    if (user.role !== 'Creator') return false;

    if (!creatorId) {
      throw new NotFoundException('creatorId is required');
    }

    const creator = await this.prisma.creatorChannel.findUnique({
      where: { id: +creatorId },
      select: { userId: true },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with id ${creatorId} not found`);
    }
    if (creator.userId === user.id) return true;

    throw new ForbiddenException("You don't own this creator profile");
  }
}

/** 
 * Guard that checks if the user is either an Admin or the owner of a Creator profile.
 * 
 * For users with the 'Creator' role, the 'creatorId' must be provided in the query parameters.
 * 
 * @throws {NotFoundException} If 'creatorId' is not provided or if the Creator with the given ID is not found.
 * @throws {ForbiddenException} If the user does not own the Creator profile.
 */
export function AdminOrCreatorOwner() {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), AdminOrCreatorOwnerGuard),
    Roles(Role.Superadmin, Role.Admin, Role.Creator),
    ApiBearerAuth('JWT-user'),
  );
}
