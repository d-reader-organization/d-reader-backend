import { Prisma } from '@prisma/client';
import {
  throttle,
  memoize,
  debounce,
  ThrottleSettings,
  DebounceSettings,
  DebouncedFunc,
} from 'lodash';

export interface MemoizeDebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  flush: (...args: Parameters<T>) => void;
}

export function memoizeThrottle<T extends (...args: any[]) => any>(
  func: T,
  wait = 0,
  options: ThrottleSettings = {},
  resolver?: (...args: Parameters<T>) => any,
): MemoizeDebouncedFunction<T> {
  const mem = memoize<(...args: Parameters<T>) => DebouncedFunc<T>>(function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: Parameters<T>
  ) {
    return throttle(func, wait, options);
  }, resolver);

  const wrappedFunction = (...args: Parameters<T>) => mem(...args)(...args);
  wrappedFunction.flush = (...args: Parameters<T>): void => {
    mem(...args).flush();
  };

  return wrappedFunction;
}

export function memoizeDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait = 0,
  options: DebounceSettings = {},
  resolver?: (...args: Parameters<T>) => any,
): MemoizeDebouncedFunction<T> {
  const mem = memoize<(...args: Parameters<T>) => DebouncedFunc<T>>(function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._args: Parameters<T>
  ) {
    return debounce(func, wait, options);
  }, resolver);

  const wrappedFunction = (...args: Parameters<T>) => mem(...args)(...args);
  wrappedFunction.flush = (...args: Parameters<T>): void => {
    mem(...args).flush();
  };

  return wrappedFunction;
}

export function insensitive(string: string): Prisma.StringFilter {
  return { equals: string, mode: 'insensitive' };
}

export function ifDefined<T, K>(
  object: T,
  callback: (object: T) => K | undefined,
) {
  if (object !== undefined) return callback(object);
  else return undefined;
}
