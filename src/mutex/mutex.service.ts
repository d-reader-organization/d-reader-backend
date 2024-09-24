import { Injectable } from '@nestjs/common';
import { Mutex } from 'async-mutex';

type MutexData = {
  identifier: string;
  data: object;
};

@Injectable()
export class MutexService {
  private readonly mutexes: Map<string, Mutex> = new Map();

  set({ identifier, data }: MutexData): Mutex {
    const mutex = new Mutex();
    this.mutexes.set(JSON.stringify({ identifier, data }), mutex);
    return mutex;
  }

  get({ identifier, data }: MutexData): Mutex | undefined {
    return this.mutexes.get(JSON.stringify({ identifier, data }));
  }

  awaitUnlock({ identifier, data }: MutexData): Promise<void> {
    const mutex = this.mutexes.get(JSON.stringify({ identifier, data }));
    if (!mutex) return Promise.resolve();

    return mutex.waitForUnlock();
  }
}
