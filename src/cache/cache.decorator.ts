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

      const cachedValue = await cacheService.get<string>(key);
      if (cachedValue) {
        console.log(`Cache hit for ${key}`);
        return JSON.parse(cachedValue);
      }

      console.log(`Cache miss for ${key}. Caching now...`);
      try {
        const value = await originalMethod.apply(this, args);
        await cacheService.set(key, JSON.stringify(value), ttl * 1000);
        return value;
      } catch (error) {
        console.error(
          `Error while executing cache callback for ${key}:`,
          error,
        );
        throw error;
      }
    };

    return descriptor;
  };
}
