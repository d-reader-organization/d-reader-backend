import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletEntity } from '../decorators/wallet.decorator';
import { RestAuthGuard } from '../guards/rest-auth.guard';
import { Wallet } from '../wallet/entities/wallet.entity';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('request-password/:address')
  async requestPassword(@Param('address') address: string) {
    return await this.authService.generateOneTimePassword(address);
  }

  @Get('connect/:address/:encoding')
  async connect(
    @Param('address') address: string,
    @Param('encoding') encoding: string,
  ) {
    return await this.authService.connect(address, encoding);
  }

  @UseGuards(RestAuthGuard)
  @Get('refresh-token/:refreshToken')
  async reauthorize(
    @Param('refreshToken') refreshToken: string,
    @WalletEntity()
    wallet: Wallet,
  ) {
    return await this.authService.refreshAccessToken(wallet, refreshToken);
  }
}
