import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  mixin,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { GlobalRateLimitExceededException } from 'src/utils/http-exception';
import { CacheService } from 'src/cache/cache.service';
import { CachePath } from 'src/utils/cache';

export function GlobalThrottlerInterceptor({
  cooldown = 1000,
  limit,
}: {
  limit: number;
  cooldown: number;
}) {
  @Injectable()
  class GlobalThrottlerInterceptorMixin implements NestInterceptor {
    constructor(readonly cacheService: CacheService) {}

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const request: Request = context.switchToHttp().getRequest();

      const path = request.route.path;
      const key = CachePath.GLOBAL_RATE_LIMIT(path);
      const count = (await this.cacheService.get<number>(key)) || 0;

      if (count > limit) {
        throw new GlobalRateLimitExceededException();
      }

      await this.cacheService.set(key, count + 1, cooldown);
      return next.handle();
    }
  }

  const interceptor = mixin(GlobalThrottlerInterceptorMixin);
  return interceptor;
}
