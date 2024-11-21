import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { UserAuth } from './guards/user-auth.guard';
import { CreatorAuth } from './guards/creator-auth.guard';
import { UserEntity } from './decorators/user.decorator';
import { CreatorEntity } from './decorators/creator.decorator';
import { CreatorPayload, UserPayload } from './auth/dto/authorization.dto';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor } from './cache/cache.interceptor';
import { LOOSE_THROTTLER_CONFIG } from './constants';

@ApiTags('App')
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* Hello World test endpoint */
  @UseInterceptors(CacheInterceptor({ ttl: 15 })) // 15 sec cache
  @Get('hello')
  get(): string {
    return this.appService.get();
  }

  /* User authenticated Hello World test endpoint */
  @UserAuth()
  @UseInterceptors(CacheInterceptor({ ttl: 15, userScope: true })) // 15 sec cache
  @Get('hello-authenticated-user')
  getUserAuth(@UserEntity() user: UserPayload): string {
    return this.appService.getAuth(user.id);
  }

  /* Creator authenticated Hello World test endpoint */
  @CreatorAuth()
  @Get('hello-authenticated-creator')
  getCreatorAuth(@CreatorEntity() creator: CreatorPayload): string {
    return this.appService.getAuth(creator.id);
  }

  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Get('healthcheck')
  async healthCheck(): Promise<string> {
    return await this.appService.healthCheck();
  }
}
