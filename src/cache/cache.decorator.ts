import { CacheService } from './cache.service';

/**
 * Decorator to cache the result of a method for a specified time-to-live (TTL).
 * The CacheService must be available in the context where this decorator is applied.
 *
 * @param {number} ttl - The time in seconds for which the result should be cached. Defaults to 60 seconds.
 */
export function Cacheable(ttl: number = 60) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      this: { cacheService: CacheService },
      ...args: any[]
    ) {
      const cacheService = this.cacheService as CacheService;
      const key = `${propertyKey}:${JSON.stringify(args)}`;
      return await cacheService.fetchAndCache(
        key,
        originalMethod.bind(this),
        ttl,
        ...args,
      );
    };

    return descriptor;
  };
}
