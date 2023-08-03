import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { UserEntity } from './decorators/user.decorator';
import { RestAuthGuard } from './guards/rest-auth.guard';
import { User } from '@prisma/client';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(ThrottlerGuard)
@ApiTags('App')
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* Hello World test endpoint */
  @Get('hello')
  get(): string {
    return this.appService.get();
  }

  /* Authenticated Hello World test endpoint */
  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('hello-authenticated')
  getAuth(@UserEntity() user: User): string {
    return this.appService.getAuth(user.id);
  }

  @SkipThrottle()
  @Get('healthcheck')
  async healthCheck(): Promise<string> {
    return this.appService.healthCheck();
  }
}
