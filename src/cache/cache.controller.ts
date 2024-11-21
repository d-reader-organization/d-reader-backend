import { Controller, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../guards/roles.guard';
import { CacheService } from './cache.service';

@ApiTags('Cache')
@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @AdminGuard()
  @Patch('reset')
  async resetCache() {
    return await this.cacheService.reset();
  }

  @AdminGuard()
  @Patch('delete/:key')
  async clearCache(@Param('key') key: string) {
    return await this.cacheService.delete(key);
  }
}
