import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  mixin,
} from '@nestjs/common';
import { Wallet } from '@prisma/client';
import { Request } from 'express';
import { Observable, catchError, map, throwError } from 'rxjs';
import { MutexService } from './mutex.service';

type ValueOrigin = 'query' | 'param' | 'body' | 'auth';

type MutexLockValues = { [key in string]: ValueOrigin };

const generateMutexDataEntry = (origin: string, value: string): string =>
  `${origin}:${value}`;

export function MutexInterceptor(
  identifier = '',
  lockValues: MutexLockValues = {},
) {
  @Injectable()
  class MutexInterceptorMixin implements NestInterceptor {
    constructor(readonly mutexService: MutexService) {}

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const request: Request & { user: Wallet } = context
        .switchToHttp()
        .getRequest();

      const data: { [key in string]: any } = {};

      for (const [key, value] of Object.entries(lockValues)) {
        switch (value) {
          case 'auth':
            const user = request.user;
            data[key] = generateMutexDataEntry(value, user[key]);
            break;
          case 'body':
            const body = request.body;
            data[key] = generateMutexDataEntry(value, body[key]);
            break;
          case 'param':
            const params = request.params;
            data[key] = generateMutexDataEntry(value, params[key]);
            break;
          case 'query':
            const queryParams = request.query;
            data[key] = generateMutexDataEntry(
              value,
              queryParams[key].toString(),
            );
            break;
        }
      }

      let mutex = this.mutexService.get({ identifier, data });
      if (!mutex) mutex = this.mutexService.set({ identifier, data });

      const release = await mutex.acquire();

      return next.handle().pipe(
        map((response) => {
          release();
          return response;
        }),
        catchError((error) => {
          release();
          return throwError(() => error);
        }),
      );
    }
  }

  const interceptor = mixin(MutexInterceptorMixin);
  return interceptor;
}
