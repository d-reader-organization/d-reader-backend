import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { toWalletDto, toWalletDtoArray, WalletDto } from './dto/wallet.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { WalletUpdateGuard } from 'src/guards/wallet-update.guard';
import { toWalletAssetDtoArray, WalletAssetDto } from './dto/wallet-asset.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { memoizeThrottle } from 'src/utils/lodash';
import { Wallet } from '@prisma/client';

@UseGuards(RestAuthGuard, WalletUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /* Get all wallets */
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('get')
  async findAll(): Promise<WalletDto[]> {
    const wallets = await this.walletService.findAll();
    return toWalletDtoArray(wallets);
  }

  /* Get wallet data from auth token */
  @Get('get/me')
  async findMe(@WalletEntity() wallet: Wallet): Promise<WalletDto> {
    const me = await this.walletService.findMe(wallet.address);
    return toWalletDto(me);
  }

  /* Get all NFTs owned by the authorized wallet */
  @Get('get/my-assets')
  async findMyAssets(
    @WalletEntity() wallet: Wallet,
  ): Promise<WalletAssetDto[]> {
    const assets = await this.walletService.findMyAssets(wallet.address);
    return await toWalletAssetDtoArray(assets);
  }

  /* Get specific wallet by unique address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<WalletDto> {
    const wallet = await this.walletService.findOne(address);
    return toWalletDto(wallet);
  }

  /* Update specific wallet */
  @Patch('update/:address')
  async update(
    @Param('address') address: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ): Promise<WalletDto> {
    const wallet = await this.walletService.update(address, updateWalletDto);
    return toWalletDto(wallet);
  }

  /* Update specific wallets avatar file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch('update/:address/avatar')
  async updateAvatar(
    @Param('address') address: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<WalletDto> {
    const updatedWallet = await this.walletService.updateFile(
      address,
      avatar,
      'avatar',
    );
    return toWalletDto(updatedWallet);
  }

  /* Redeem a referral by wallet address or username */
  @Patch('redeem-referral/:referrer')
  async redeemReferral(
    @Param('referrer') referrer: string,
    @WalletEntity() wallet: Wallet,
  ) {
    const updatedWallet = await this.walletService.redeemReferral(
      referrer,
      wallet.address,
    );
    return toWalletDto(updatedWallet);
  }

  private syncWallet = (address: string) => {
    return this.walletService.syncWallet(address);
  };

  @Get('sync')
  publicSyncWallet(@WalletEntity() wallet: Wallet) {
    const throttledSyncWallet = memoizeThrottle(
      this.syncWallet,
      2 * 60 * 1000, // 2 minutes
      {},
      (address: string) => address,
    );

    return throttledSyncWallet(wallet.address);
  }
}
