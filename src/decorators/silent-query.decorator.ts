import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const SilentQuery = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) {
      return request.query[data];
    } else {
      return request.query;
    }
  },
);
