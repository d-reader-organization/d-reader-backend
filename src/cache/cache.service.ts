import { Injectable } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class CacheService {
  constructor(
    private cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  async fetchAndCache<T>(
    key: string,
    callback: (...args: any[]) => Promise<T>,
    ttl: number = 60,
    ...args: any[]
  ): Promise<T> {
    const cachedValue = await this.cacheManager.get<T>(key);
    if (cachedValue) {
      console.log(`Cache hit for ${key}`);
      return cachedValue;
    }
    console.log(`Cache miss for ${key}. Caching now...`);
    try {
      const value = await callback.bind(this)(...args);
      console.log(value);
      await this.cacheManager.set(key, value, ttl * 1000);
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

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }
}
