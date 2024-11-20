import { CacheService } from './cache.service';

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
