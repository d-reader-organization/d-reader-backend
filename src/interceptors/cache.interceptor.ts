import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  mixin,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { UserPayload } from 'src/auth/dto/authorization.dto';

// 60 seconds
export function CacheInterceptor({ ttl = 60, userScope = false }) {
  @Injectable()
  class CacheInterceptorMixin implements NestInterceptor {
    constructor(@Inject(CACHE_MANAGER) readonly cacheManager: Cache) {}

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const request: Request & { user: UserPayload } = context
        .switchToHttp()
        .getRequest();

      let cacheKey = `cacheinterceptor:"${request.url}"`;
      if (userScope) cacheKey += `:${request.user.id}`;

      const data = await this.cacheManager.get(cacheKey);

      if (data) {
        console.log(`DEBUG: from cache [${cacheKey}]`);
        return of(JSON.parse(data as string));
      }

      console.log(`DEBUG: not from cache [${cacheKey}]`);

      return next.handle().pipe(
        map(async (response) => {
          await this.cacheManager.set(
            cacheKey,
            JSON.stringify(response),
            ttl * 1000,
          );
          return response;
        }),
        catchError((error) => {
          return throwError(() => error);
        }),
      );
    }
  }

  const interceptor = mixin(CacheInterceptorMixin);
  return interceptor;
}
