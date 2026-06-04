import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  <T extends Record<string, unknown> = Record<string, unknown>>(
    key: keyof T | undefined,
    ctx: ExecutionContext,
  ): T[keyof T] | T | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as T;

    return key ? user?.[key] : user;
  },
);