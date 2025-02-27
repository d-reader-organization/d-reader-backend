import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { seconds, Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { UserAuth } from './guards/user-auth.guard';
import { UserEntity } from './decorators/user.decorator';
import { UserPayload } from './auth/dto/authorization.dto';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor } from './cache/cache.interceptor';
import { LOOSE_THROTTLER_CONFIG } from './constants';

@ApiTags('App')
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* Hello World test endpoint */
  @UseInterceptors(CacheInterceptor({ ttl: seconds(15) }))
  @Get('hello')
  get(): string {
    return this.appService.get();
  }

  /* User authenticated Hello World test endpoint */
  @UserAuth()
  @UseInterceptors(CacheInterceptor({ ttl: seconds(15), userScope: true }))
  @Get('hello-authenticated-user')
  getUserAuth(@UserEntity() user: UserPayload): string {
    return this.appService.getAuth(user.id);
  }

  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Get('healthcheck')
  async healthCheck(): Promise<string> {
    return await this.appService.healthCheck();
  }
}
