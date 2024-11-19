import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  mixin,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { UserPayload } from '../auth/dto/authorization.dto';
import { CacheService } from './cache.service';

// 60 seconds
export function CacheInterceptor({ ttl = 60, userScope = false }) {
  @Injectable()
  class CacheInterceptorMixin implements NestInterceptor {
    constructor(readonly cacheService: CacheService) {}

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const request: Request & { user: UserPayload } = context
        .switchToHttp()
        .getRequest();

      console.log('processing cache: ' + request.url);
      if (
        // TODO: standardize searches as 'searchString' or something like that
        request.url.includes('titleSubstring') ||
        request.url.includes('nameSubstring')
      ) {
        console.info('opting out of cache!');
        return next.handle();
        // return next.handle().pipe(map((response) => response));
      }

      let cacheKey = `cacheinterceptor:"${request.url}"`;
      if (userScope) cacheKey += `:${request.user.id}`;

      const data = await this.cacheService.get(cacheKey);

      if (data) {
        console.warn(`DEBUG: from cache [${cacheKey}]`);
        return of(JSON.parse(data as string));
      }

      console.warn(`DEBUG: not from cache [${cacheKey}]`);

      return next.handle().pipe(
        map(async (response) => {
          await this.cacheService.set(
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
