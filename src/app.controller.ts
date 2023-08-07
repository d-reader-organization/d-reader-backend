import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { PayloadEntity } from './decorators/payload.decorator';
import { RestAuthGuard } from './guards/rest-auth.guard';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtPayload } from './auth/dto/authorization.dto';

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
  getAuth(@PayloadEntity() user: JwtPayload): string {
    return this.appService.getAuth(user.id);
  }

  @SkipThrottle()
  @Get('healthcheck')
  async healthCheck(): Promise<string> {
    return this.appService.healthCheck();
  }
}
