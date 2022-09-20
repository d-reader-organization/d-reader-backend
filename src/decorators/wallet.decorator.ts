import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Wallet } from '@prisma/client';

export const WalletEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<{ user: Wallet }>().user,
);
