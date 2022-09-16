import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { RestAuthGuard } from './guards/rest-auth.guard';

@ApiTags('App')
@ApiBearerAuth('JWT-auth')
@UseGuards(RestAuthGuard)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* Hello World test endpoint */
  @Get()
  get(): string {
    return this.appService.get();
  }
}
