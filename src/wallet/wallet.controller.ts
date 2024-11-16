import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiTags } from '@nestjs/swagger';
import { toWalletDto, WalletDto } from './dto/wallet.dto';
import { toWalletAssetDtoArray, WalletAssetDto } from './dto/wallet-asset.dto';
import { minutes, Throttle } from '@nestjs/throttler';
import { WalletOwnerAuth } from '../guards/wallet-owner.guard';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { CacheInterceptor } from 'src/interceptors/cache.interceptor';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /* Get all wallets */
  // @Get('get')
  // async findAll(): Promise<WalletDto[]> {
  //   const wallets = await this.walletService.findAll();
  //   return toWalletDtoArray(wallets);
  // }

  /* Get specific wallet by unique address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<WalletDto> {
    const wallet = await this.walletService.findOne(address);
    return toWalletDto(wallet);
  }

  /* Get all NFTs owned by the wallet */
  @Get('get/:address/assets')
  async getAssets(
    @Param('address') address: string,
  ): Promise<WalletAssetDto[]> {
    const assets = await this.walletService.getAssets(address);
    return toWalletAssetDtoArray(assets);
  }

  /* Update specific wallet */
  @WalletOwnerAuth()
  @Patch('update/:address')
  async update(
    @Param('address') address: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ): Promise<WalletDto> {
    const wallet = await this.walletService.update(address, updateWalletDto);
    return toWalletDto(wallet);
  }

  @Throttle({ long: { ttl: minutes(3), limit: 3 } })
  @Get('sync/:address')
  syncWallet(@Param('address') address: string) {
    return this.walletService.syncWallet(address);
  }
}
