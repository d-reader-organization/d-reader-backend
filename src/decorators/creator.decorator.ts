import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'src/types/request';

export const CreatorEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<Request>().user?.creator,
);
