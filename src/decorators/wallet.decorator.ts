import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const WalletEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().user,
);
