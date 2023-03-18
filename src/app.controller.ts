import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { WalletEntity } from './decorators/wallet.decorator';
import { RestAuthGuard } from './guards/rest-auth.guard';
import { Wallet } from '@prisma/client';
import { ThrottlerGuard } from '@nestjs/throttler';

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
  getAuth(@WalletEntity() wallet: Wallet): string {
    return this.appService.getAuth(wallet.address);
  }
}
