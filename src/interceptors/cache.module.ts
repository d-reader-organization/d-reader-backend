import { CacheModule as CacheManagerModule } from '@nestjs/cache-manager';
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  imports: [CacheManagerModule.register()],
  exports: [CacheManagerModule.register()],
})
export class CacheModule {}
