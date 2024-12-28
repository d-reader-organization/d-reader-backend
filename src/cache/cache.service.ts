import { Injectable } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(private cacheManager: Cache) {}

  async fetchAndCache<T>(
    key: string,
    callback: (...args: any[]) => Promise<T>,
    ttl = 60000, // default 60000 miliseconds
    ...args: any[]
  ): Promise<T> {
    const cachedValue = await this.cacheManager.get<string>(key);
    if (cachedValue) {
      return JSON.parse(cachedValue, (_, value) => {
        return value?.type === 'Buffer' ? Buffer.from(value) : value;
      });
    }

    try {
      const value = await callback.apply(this, args);
      await this.cacheManager.set(key, JSON.stringify(value), ttl);
      return value;
    } catch (error) {
      console.error(`Error while executing cache callback for ${key}:`, error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async get<T>(key: string): Promise<T> {
    return await this.cacheManager.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.cacheManager.store.keys();
    const matchingKeys = keys.filter((key) => key.includes(pattern));

    for (const key of matchingKeys) {
      await this.delete(key);
    }
  }

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }
}
