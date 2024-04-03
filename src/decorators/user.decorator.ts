import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GoogleUserRequest, UserRequest } from 'src/types/request';

export const UserEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<UserRequest>().user,
);

export const GoogleUserEntity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<GoogleUserRequest>().user,
);
