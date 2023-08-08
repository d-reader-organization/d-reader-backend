import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRequest } from 'src/types/request';

export const UserEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<UserRequest>().user,
);
