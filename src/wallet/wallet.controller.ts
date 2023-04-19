import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { toWalletDto, toWalletDtoArray, WalletDto } from './dto/wallet.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { WalletUpdateGuard } from 'src/guards/wallet-update.guard';
import { toWalletAssetDtoArray, WalletAssetDto } from './dto/wallet-asset.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Wallet } from '@prisma/client';

@UseGuards(RestAuthGuard, WalletUpdateGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Throttle(5, 30)
  @Get('redeem/referral/:referee')
  async redeemReferral(
    @Param('referee') referee: string,
    @WalletEntity() wallet: Wallet,
  ) {
    return await this.walletService.redeemReferral(referee, wallet.address);
  }

  /* Create a new wallet */
  @Post('create')
  async create(@Body() createWalletDto: CreateWalletDto): Promise<WalletDto> {
    const wallet = await this.walletService.create(createWalletDto);
    return await toWalletDto(wallet);
  }

  /* Get all wallets */
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('get')
  async findAll(): Promise<WalletDto[]> {
    const wallets = await this.walletService.findAll();
    return await toWalletDtoArray(wallets);
  }

  /* Get wallet data from auth token */
  @Get('get/me')
  async findMe(@WalletEntity() wallet: Wallet): Promise<WalletDto> {
    const me = await this.walletService.findOne(wallet.address);
    return await toWalletDto(me);
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
    return await toWalletDto(wallet);
  }

  /* Update specific wallet */
  @Patch('update/:address')
  async update(
    @Param('address') address: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ): Promise<WalletDto> {
    const wallet = await this.walletService.update(address, updateWalletDto);
    return await toWalletDto(wallet);
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
    const updatedWallet = await this.walletService.updateFile(address, avatar);
    return await toWalletDto(updatedWallet);
  }

  /* Delete specific wallet */
  @Delete('delete/:address')
  remove(@Param('address') address: string) {
    return this.walletService.remove(address);
  }
}
