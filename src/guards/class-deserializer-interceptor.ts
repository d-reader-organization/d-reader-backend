import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class ClassDeserializerInterceptor<T> implements NestInterceptor<T> {
  constructor(private readonly classType: ClassConstructor<T>) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<T>> {
    return next.handle().pipe(
      map((data) =>
        plainToInstance<T, unknown>(this.classType, data, {
          excludeExtraneousValues: true,
        }),
      ),
    );
  }
}
