import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CreatorRequest } from 'src/types/request';

export const CreatorEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<CreatorRequest>().user,
);
