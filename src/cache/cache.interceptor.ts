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

/**
 * Interceptor to manage caching of HTTP requests.
 *
 * This interceptor checks if the response for a request is already cached
 * and returns the cached data if available. If not, it processes the request
 * and caches the response for a specified time-to-live (TTL).
 *
 * @param {Object} options - Configuration options for the interceptor.
 * @param {number} options.ttl - The time in seconds for which the response should be cached. Defaults to 60 seconds.
 * @param {boolean} options.userScope - Indicates whether the cache should be user-specific. Defaults to false.
 */
export function CacheInterceptor({
  ttl = 60,
  userScope = false,
}: {
  ttl: number;
  userScope?: boolean;
}) {
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

      if (
        request.url.includes('titleSubstring') ||
        request.url.includes('nameSubstring') ||
        request.url.includes('search')
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
