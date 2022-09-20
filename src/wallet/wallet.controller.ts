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
import { RolesGuard, Roles } from 'src/guards/roles.guard';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { WalletDto } from './dto/wallet.dto';
import { Wallet, Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /* Create a new wallet */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @Post('create')
  async create(@Body() createWalletDto: CreateWalletDto): Promise<WalletDto> {
    const wallet = await this.walletService.create(createWalletDto);
    return plainToInstance(WalletDto, wallet);
  }

  /* Get all wallets */
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('get')
  async findAll(): Promise<WalletDto[]> {
    const wallets = await this.walletService.findAll();
    return plainToInstance(WalletDto, wallets);
  }

  /* Get wallet data from auth token */
  @Get('get/me')
  async findMe(@WalletEntity() wallet: Wallet): Promise<WalletDto> {
    const me = await this.walletService.findOne(wallet.address);
    return plainToInstance(WalletDto, me);
  }

  /* Get specific wallet by unique address */
  @Get('get/:address')
  async findOne(@Param('address') address: string): Promise<WalletDto> {
    const wallet = await this.walletService.findOne(address);
    return plainToInstance(WalletDto, wallet);
  }

  /* Update specific wallet */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('update/:address')
  async update(
    @Param('address') address: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ): Promise<WalletDto> {
    const wallet = await this.walletService.update(address, updateWalletDto);
    return plainToInstance(WalletDto, wallet);
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
    return plainToInstance(WalletDto, updatedWallet);
  }

  /* Delete specific wallet */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @Delete('delete/:address')
  remove(@Param('address') address: string) {
    return this.walletService.remove(address);
  }
}
